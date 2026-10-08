import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanService, HttpError } from '../src/services/planService.js';
import { PlanFailedError } from '../src/services/planWorkflow.js';
import { createApp } from '../src/app.js';
import { buildPlanningContext } from '../src/services/scheduling.js';
import { validateProposal } from '../src/services/validator.js';
import { DAY1 } from './fixtures/canonical.js';
import { body, now, memoryStore, greedyAi, okAi } from './helpers.js';

test('saveSetup stores subjects with ids and no sessions', async () => {
  const service = createPlanService({ store: memoryStore(), propose: okAi, now });
  const plan = await service.saveSetup(body);
  assert.equal(plan.sessions.length, 0);
  assert.ok(plan.subjects[0].id);
  assert.ok(plan.subjects[0].topics.every((t) => t.id));
});

test('saveSetup rejects bad input with a readable message', async () => {
  const service = createPlanService({ store: memoryStore(), propose: okAi, now });
  const bad = structuredClone(body);
  bad.subjects[0].topics[0].difficulty = 6;
  await assert.rejects(() => service.saveSetup(bad), HttpError);
  const past = structuredClone(body);
  past.subjects[0].examDate = DAY1;
  await assert.rejects(() => service.saveSetup(past), /must be after today/);
});

test('generate saves sessions that satisfy every hard rule', async () => {
  const store = memoryStore();
  const service = createPlanService({ store, propose: okAi, now });
  await service.saveSetup(body);
  const plan = await service.generate();
  assert.equal(plan.sessions.length, 3);
  assert.ok(plan.sessions.every((s) => s.status === 'planned' && s.plannedMinutes === 120));
  const { plan: reloaded } = await service.getPlan();
  assert.deepEqual(reloaded.sessions, plan.sessions);
  const context = buildPlanningContext({ plan: { ...reloaded, sessions: [] }, today: DAY1 });
  const asProposal = {
    sessions: reloaded.sessions.map((s) => ({ topicId: s.topicId, date: s.date, minutes: s.plannedMinutes, priority: s.priority })),
    notScheduled: [], changes: [], summary: context.summary, explanation: 'x',
  };
  assert.deepEqual(validateProposal(asProposal, context), []);
});

test('a rule-breaking proposal triggers one repair attempt with the broken rules listed', async () => {
  const calls = [];
  const propose = async (args) => {
    calls.push(args);
    if (calls.length === 1) {
      const bad = greedyAi(args.context);
      bad.sessions[0].minutes = 500;
      return { proposal: bad, raw: '' };
    }
    return okAi(args);
  };
  const service = createPlanService({ store: memoryStore(), propose, now });
  await service.saveSetup(body);
  const plan = await service.generate();
  assert.equal(calls.length, 2);
  assert.equal(calls[0].repairNotes, undefined);
  assert.match(calls[1].repairNotes.join('\n'), /day-capacity/);
  assert.equal(plan.sessions.length, 3);
});

test('two bad proposals fail, nothing is saved, and the setup is intact', async () => {
  const propose = async ({ context }) => {
    const bad = greedyAi(context);
    bad.sessions[0].minutes = 500;
    return { proposal: bad, raw: '' };
  };
  const service = createPlanService({ store: memoryStore(), propose, now });
  await service.saveSetup(body);
  await assert.rejects(() => service.generate(), PlanFailedError);
  const { plan } = await service.getPlan();
  assert.equal(plan.sessions.length, 0);
  assert.equal(plan.subjects.length, 1);
});

test('the HTTP API: empty, setup, generate, reload, start over', async () => {
  const service = createPlanService({ store: memoryStore(), propose: okAi, now });
  const server = createApp({ service }).listen(0);
  const base = `http://localhost:${server.address().port}/api`;
  const call = async (method, path, payload) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    return { status: res.status, json: await res.json() };
  };
  try {
    assert.deepEqual(await call('GET', '/plan'), { status: 200, json: { plan: null, today: DAY1, unconfirmedIds: [] } });
    assert.equal((await call('POST', '/plan/generate')).status, 404);
    assert.equal((await call('PUT', '/setup', { subjects: [] })).status, 400);
    assert.equal((await call('PUT', '/setup', body)).status, 200);
    const generated = await call('POST', '/plan/generate');
    assert.equal(generated.status, 200);
    assert.equal(generated.json.plan.sessions.length, 3);
    assert.equal((await call('GET', '/plan')).json.plan.sessions.length, 3);
    assert.equal((await call('DELETE', '/plan')).status, 200);
    assert.equal((await call('GET', '/plan')).json.plan, null);
  } finally {
    server.close();
  }
});
