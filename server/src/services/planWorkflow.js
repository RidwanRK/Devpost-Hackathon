// Ask the AI for a proposal, validate it, and make at most one repair attempt.
// Used by both first-plan generation and replans. A proposal that fails validation twice
// is never returned: the caller gets a PlanFailedError and the student keeps the current plan.
import { proposePlan } from './aiPlanner.js';
import { validateProposal } from './validator.js';

export class PlanFailedError extends Error {
  constructor(message, brokenRules = []) {
    super(message);
    this.brokenRules = brokenRules;
  }
}

export async function getValidProposal({ mode, context, history, currentSessions, propose = proposePlan }) {
  let repairNotes;
  let brokenRules = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    let result;
    try {
      result = await propose({ mode, context, history, currentSessions, repairNotes });
    } catch (err) {
      throw new PlanFailedError(err.message);
    }
    brokenRules = validateProposal(result.proposal, context);
    if (brokenRules.length === 0) return result.proposal;
    repairNotes = brokenRules.map((e) => `[${e.rule}] ${e.message}`);
  }
  throw new PlanFailedError('The AI proposal broke the rules twice', brokenRules);
}
