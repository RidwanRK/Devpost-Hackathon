// One-off proof that the AI integration works end to end.
//   1. Send the canonical scenario (Day 2, Transaction Scheduling missed) to Gemini.
//   2. Print the raw answer, then run it through the validator.
//   3. Run a deliberately broken answer through the validator and watch it get rejected.
// Usage: put GEMINI_API_KEY in server/.env, then `npm run ai-smoke --workspace server`.
import 'dotenv/config';
import { buildPlanningContext, describeHistory } from '../src/services/scheduling.js';
import { validateProposal } from '../src/services/validator.js';
import { proposePlan, DEFAULT_MODEL } from '../src/services/aiPlanner.js';
import { setup, originalSessions, DAY2, brokenResponses } from '../test/fixtures/canonical.js';

const plan = { ...setup, sessions: originalSessions };
const context = buildPlanningContext({ plan, today: DAY2 });
const history = describeHistory({ plan, today: DAY2 });
const currentSessions = originalSessions.filter((s) => s.date >= DAY2);

console.log(`Model: ${process.env.GEMINI_MODEL || DEFAULT_MODEL}`);
console.log(`Backend-calculated numbers: ${JSON.stringify(context.summary)}\n`);

console.log('--- 1. Asking Gemini to replan (this is the real call) ---');
let result;
try {
  result = await proposePlan({ mode: 'replan', context, history, currentSessions });
} catch (err) {
  console.error(`FAILED: ${err.message}`);
  process.exitCode = 1;
  throw new Error("smoke test failed");
}
console.log(result.raw);

console.log('\n--- 2. Validating the real AI answer ---');
const errors = validateProposal(result.proposal, context);
if (errors.length === 0) {
  console.log('VALID: every hard rule holds. This answer would be shown to the student.');
} else {
  console.log('REJECTED. The student would never see this answer. Broken rules:');
  for (const e of errors) console.log(`  - [${e.rule}] ${e.message}`);
}

console.log('\n--- 3. Validating a deliberately broken answer (two sessions on one 2-hour day) ---');
const brokenErrors = validateProposal(brokenResponses['day-capacity'], context);
if (brokenErrors.length === 0) {
  console.error('PROBLEM: the broken answer was accepted. The validator is not doing its job.');
  process.exitCode = 1;
  throw new Error("smoke test failed");
}
console.log('REJECTED, as it should be. Broken rules:');
for (const e of brokenErrors) console.log(`  - [${e.rule}] ${e.message}`);

process.exitCode = errors.length === 0 ? 0 : 2;
