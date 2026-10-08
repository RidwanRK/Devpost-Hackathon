import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanService, HttpError } from '../src/services/planService.js';
import { applySessionUpdate } from '../src/services/sessionRules.js';
import { buildPlanningContext } from '../src/services/scheduling.js';
import { DAY1, DAY2 } from './fixtures/canonical.js';
import { body, now, memoryStore, okAi } from './helpers.js';

const session = { id: 's1', topicId: 't1', date: DAY1, plannedMinutes: 120, status: 'planned', actualMinutes: null, confidenceAfter: null };

test('completed with no actual time is accepted and keeps actual empty', () => {
  const { session: s } = applySessionUpdate(session, { status: 'completed' });
  assert.equal(s.status, 'completed');
  assert.equal(s.actualMinutes, null);
});

test('partial without actual time is rejected', () => {
  assert.match(applySessionUpdate(session, { status: 'partial' }).error, /how many minutes/);
});

test('actual time over the planned time is rejected, for completed and partial', () => {
  assert.match(applySessionUpdate(session, { status: 'completed', actualMinutes: 121 }).error, /between 0 and 120/);
  assert.match(applySessionUpdate(session, { status: 'partial', actualMinutes: 200 }).error, /between 0 and 120/);
  assert.match(applySessionUpdate(session, { status: 'partial', actualMinutes: -5 }).error, /between 0 and 120/);
});

test('skipped clears any recorded time and confidence', () => {
  const done = { ...session, status: 'completed', actualMinutes: 90, confidenceAfter: 4 };
  const { session: s } = applySessionUpdate(done, { status: 'skipped', actualMinutes: 50 });
  assert.deepEqual([s.status, s.actualMinutes, s.confidenceAfter], ['skipped', null, null]);
});

async function planned() {
  const service = createPlanService({ store: memoryStore(), propose: okAi, now });
  await service.saveSetup(body);
  const plan = await service.generate();
  return { service, plan };
}

test('a partial session saves, updates the topic confidence, and leaves the rest as remaining work', async () => {
  const { service, plan } = await planned();
  const first = plan.sessions[0];
  const updated = await service.updateSession(first.id, { status: 'partial', actualMinutes: 60, confidenceAfter: 3 });
  const saved = updated.sessions.find((s) => s.id === first.id);
  assert.deepEqual([saved.status, saved.actualMinutes, saved.confidenceAfter], ['partial', 60, 3]);
  const topic = updated.subjects[0].topics.find((t) => t.id === first.topicId);
  assert.equal(topic.confidence, 3);
  const context = buildPlanningContext({ plan: updated, today: DAY1 });
  assert.equal(context.topics.find((t) => t.id === first.topicId).remainingMinutes, 60);
  const { plan: reloaded } = await service.getPlan();
  assert.equal(reloaded.sessions.find((s) => s.id === first.id).status, 'partial');
});

test('invalid updates become friendly 400 errors; unknown sessions are 404', async () => {
  const { service, plan } = await planned();
  await assert.rejects(() => service.updateSession(plan.sessions[0].id, { status: 'partial' }), (e) => e instanceof HttpError && e.status === 400);
  await assert.rejects(() => service.updateSession(plan.sessions[0].id, { status: 'nonsense' }), (e) => e.status === 400);
  await assert.rejects(() => service.updateSession('nope', { status: 'skipped' }), (e) => e.status === 404);
});

test('advancing the demo clock makes an unmarked Day 1 session Unconfirmed, and marked ones are not', async () => {
  const { service, plan } = await planned();
  const [day1, day2] = plan.sessions;
  await service.updateSession(day2.id, { status: 'skipped' });
  let state = await service.getPlan();
  assert.equal(state.today, DAY1);
  assert.deepEqual(state.unconfirmedIds, []);

  await service.advanceDay();
  state = await service.getPlan();
  assert.equal(state.today, DAY2);
  assert.equal(state.plan.demoDayOffset, 1);
  assert.deepEqual(state.unconfirmedIds, [day1.id]);

  await service.updateSession(day1.id, { status: 'skipped' });
  assert.deepEqual((await service.getPlan()).unconfirmedIds, []);
});

test('advance-day needs a plan, and Start Over resets the clock', async () => {
  const service = createPlanService({ store: memoryStore(), propose: okAi, now });
  await assert.rejects(() => service.advanceDay(), (e) => e.status === 404);
  await service.saveSetup(body);
  await service.advanceDay();
  await service.clear();
  await service.saveSetup(body);
  assert.equal((await service.getPlan()).plan.demoDayOffset, 0);
});
