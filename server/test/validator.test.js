import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProposal } from '../src/services/validator.js';
import { buildPlanningContext } from '../src/services/scheduling.js';
import {
  setup, originalSessions, DAY1, DAY2, cannedGenerateResponse, cannedReplanResponse, brokenResponses,
} from './fixtures/canonical.js';

const replanContext = buildPlanningContext({ plan: { ...setup, sessions: originalSessions }, today: DAY2 });
const generateContext = buildPlanningContext({ plan: { ...setup, sessions: [] }, today: DAY1 });

test('the canned first plan passes', () => {
  assert.deepEqual(validateProposal(cannedGenerateResponse, generateContext), []);
});

test('the canned replan passes', () => {
  assert.deepEqual(validateProposal(cannedReplanResponse, replanContext), []);
});

for (const [rule, proposal] of Object.entries(brokenResponses)) {
  test(`a proposal that breaks "${rule}" is rejected with that rule named`, () => {
    const errors = validateProposal(proposal, replanContext);
    assert.ok(errors.length > 0, 'expected the proposal to be rejected');
    assert.ok(
      errors.some((e) => e.rule === rule),
      `expected rule "${rule}", got ${JSON.stringify(errors.map((e) => e.rule))}`
    );
  });
}

test('garbage is rejected by the shape check', () => {
  assert.equal(validateProposal('not json', replanContext)[0].rule, 'shape');
  assert.equal(validateProposal(null, replanContext)[0].rule, 'shape');
});
