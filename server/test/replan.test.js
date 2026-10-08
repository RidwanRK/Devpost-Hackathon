import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplanService, computeAffected } from '../src/services/replan.js';
import { createPlanService } from '../src/services/planService.js';
import {
  setup, originalSessions, DAY1, DAY2, DAY3, cannedReplanResponse, brokenResponses,
} from './fixtures/canonical.js';
import { memoryStore } from './helpers.js';

const day2 = () => new Date(2026, 2, 3, 9, 0);

// The canonical state: original plan, Day 1 session never marked, it is now Day 2.
async function canonicalStore() {
  const store = memoryStore();
  await store.save({
    demoDayOffset: 0,
    availability: setup.availability,
    subjects: structuredClone(setup.subjects),
    sessions: structuredClone(originalSessions),
    notScheduled: [],
    explanation: 'original',
    editedSinceLastPlan: false,
    pendingReplan: null,
  });
  return store;
}

const cannedAi = (response) => async () => ({ proposal: structuredClone(response), raw: '' });

test('Unconfirmed sessions must be confirmed before the AI is called', async () => {
  let called = false;
  const store = await canonicalStore();
  const service = createReplanService({ store, propose: async () => { called = true; }, now: day2 });
  await assert.rejects(() => service.replan({}), (e) => e.status === 409 && e.code === 'needs_confirmation');
  assert.equal(called, false);
});

test('canonical replan: only the three affected sessions, with the backend-calculated numbers', async () => {
  const store = await canonicalStore();
  const service = createReplanService({ store, propose: cannedAi(cannedReplanResponse), now: day2 });
  const plan = await service.replan({ treatUnconfirmedAsMissed: true });
  const { pendingReplan: pending } = plan;

  assert.deepEqual(pending.summary, { neededMinutes: 360, availableMinutes: 240 });
  assert.equal(pending.affected.length, 3);
  const by = Object.fromEntries(pending.affected.map((a) => [a.topicId, a]));
  assert.equal(by['t-trans'].kind, 'moved');
  assert.deepEqual(by['t-trans'].original, [{ date: DAY1, minutes: 120, priority: 'high', missed: true }]);
  assert.deepEqual(by['t-trans'].revised, [{ date: DAY2, minutes: 120, priority: 'high' }]);
  assert.equal(by['t-norm'].kind, 'moved');
  assert.deepEqual([by['t-norm'].original[0].date, by['t-norm'].revised[0].date], [DAY2, DAY3]);
  assert.equal(by['t-arch'].kind, 'not-scheduled');
  assert.deepEqual(by['t-arch'].revised, []);
  assert.equal(pending.notScheduled[0].topicId, 't-arch');

  // The active plan is untouched until the student accepts.
  assert.deepEqual(plan.sessions.map((s) => s.id), originalSessions.map((s) => s.id));
});

test('accept replaces only the future planned sessions and keeps history', async () => {
  const store = await canonicalStore();
  const service = createReplanService({ store, propose: cannedAi(cannedReplanResponse), now: day2 });
  await service.replan({ treatUnconfirmedAsMissed: true });
  const plan = await service.accept();

  assert.equal(plan.pendingReplan, null);
  assert.equal(plan.explanation, cannedReplanResponse.explanation);
  assert.deepEqual(plan.notScheduled.map((n) => n.topicId), ['t-arch']);
  // Day 1 stays (still unmarked, so still Unconfirmed); the old Day 2 and Day 3 sessions are gone.
  const ids = plan.sessions.map((s) => s.id);
  assert.ok(ids.includes('x1'));
  assert.ok(!ids.includes('x2') && !ids.includes('x3'));
  assert.deepEqual(
    plan.sessions.map((s) => [s.date, s.topicId]),
    [[DAY1, 't-trans'], [DAY2, 't-trans'], [DAY3, 't-norm']]
  );
});

test('a completed session is kept as history when a replan is accepted', async () => {
  const store = await canonicalStore();
  const doc = await store.load();
  doc.sessions[0] = { ...doc.sessions[0], status: 'partial', actualMinutes: 30, confidenceAfter: 2 };
  await store.save(doc);
  const service = createReplanService({ store, propose: cannedAi({
    ...cannedReplanResponse,
    summary: { neededMinutes: 330, availableMinutes: 240 },
    sessions: [
      { topicId: 't-trans', date: DAY2, minutes: 90, priority: 'high' },
      { topicId: 't-norm', date: DAY3, minutes: 120, priority: 'high' },
    ],
  }), now: day2 });
  await service.replan({});
  const plan = await service.accept();
  const kept = plan.sessions.find((s) => s.id === 'x1');
  assert.deepEqual([kept.status, kept.actualMinutes], ['partial', 30]);
});

test('keep original discards the pending proposal and changes nothing else', async () => {
  const store = await canonicalStore();
  const service = createReplanService({ store, propose: cannedAi(cannedReplanResponse), now: day2 });
  await service.replan({ treatUnconfirmedAsMissed: true });
  const plan = await service.discard();
  assert.equal(plan.pendingReplan, null);
  assert.deepEqual(plan.sessions.map((s) => s.id), originalSessions.map((s) => s.id));
  assert.equal(plan.explanation, 'original');
});

test('a proposal that breaks the rules twice is never saved and the student sees the friendly failure', async () => {
  const store = await canonicalStore();
  const service = createReplanService({ store, propose: cannedAi(brokenResponses['day-capacity']), now: day2 });
  await assert.rejects(
    () => service.replan({ treatUnconfirmedAsMissed: true }),
    (e) => e.status === 502 && /couldn't generate your revised plan/.test(e.message)
  );
  assert.equal((await store.load()).pendingReplan, null);
});

test('accepting a proposal after the date moved on is refused', async () => {
  const store = await canonicalStore();
  const service = createReplanService({ store, propose: cannedAi(cannedReplanResponse), now: day2 });
  await service.replan({ treatUnconfirmedAsMissed: true });
  const doc = await store.load();
  doc.demoDayOffset = 1;
  await store.save(doc);
  await assert.rejects(() => service.accept(), (e) => e.status === 409 && e.code === 'stale');
});

test('computeAffected names shortened and prioritized changes, and skips unchanged topics', () => {
  const topics = [
    { id: 'a', name: 'A', subjectName: 'S' },
    { id: 'b', name: 'B', subjectName: 'S' },
    { id: 'c', name: 'C', subjectName: 'S' },
  ];
  const planned = (topicId, date, plannedMinutes, priority) => ({ topicId, date, plannedMinutes, priority, status: 'planned' });
  const affected = computeAffected({
    today: DAY2,
    topics,
    oldSessions: [planned('a', DAY2, 120, 'low'), planned('b', DAY3, 120, 'high'), planned('c', DAY3, 60, 'low')],
    newSessions: [
      { topicId: 'a', date: DAY2, minutes: 120, priority: 'high' },
      { topicId: 'b', date: DAY3, minutes: 60, priority: 'high' },
      { topicId: 'c', date: DAY3, minutes: 60, priority: 'low' },
    ],
  });
  assert.deepEqual(affected.map((a) => [a.topicId, a.kind]), [['a', 'prioritized'], ['b', 'shortened']]);
});

test('the plan service exposes the pending proposal so a refresh does not lose the review', async () => {
  const store = await canonicalStore();
  const replanService = createReplanService({ store, propose: cannedAi(cannedReplanResponse), now: day2 });
  const planService = createPlanService({ store, propose: async () => { throw new Error('unused'); }, now: day2 });
  await replanService.replan({ treatUnconfirmedAsMissed: true });
  const { plan } = await planService.getPlan();
  assert.equal(plan.pendingReplan.affected.length, 3);
});
