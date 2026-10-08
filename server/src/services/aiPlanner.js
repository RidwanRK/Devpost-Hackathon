// The only module that talks to Gemini. It builds the prompt, asks for structured JSON,
// and returns the parsed proposal. It never decides whether a proposal is acceptable:
// that is the validator's job.
import { GoogleGenAI } from '@google/genai';

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const TIMEOUT_MS = 60000;

// A flat, simple JSON schema: model schema support can be limited.
export const proposalJsonSchema = {
  type: 'object',
  properties: {
    sessions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topicId: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          minutes: { type: 'integer' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['topicId', 'date', 'minutes', 'priority'],
      },
    },
    notScheduled: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topicId: { type: 'string' },
          minutes: { type: 'integer' },
          reason: { type: 'string' },
        },
        required: ['topicId', 'minutes', 'reason'],
      },
    },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topicId: { type: 'string' },
          kind: { type: 'string', enum: ['moved', 'shortened', 'prioritized', 'unchanged'] },
          reason: { type: 'string' },
        },
        required: ['topicId', 'kind', 'reason'],
      },
    },
    summary: {
      type: 'object',
      properties: {
        neededMinutes: { type: 'integer' },
        availableMinutes: { type: 'integer' },
      },
      required: ['neededMinutes', 'availableMinutes'],
    },
    explanation: { type: 'string' },
  },
  required: ['sessions', 'notScheduled', 'changes', 'summary', 'explanation'],
};

export class AiError extends Error {}

const RULES = `Hard rules (a program checks every one; a plan that breaks any is thrown away):
1. For each date, the total "minutes" of sessions must not exceed that date's availableMinutes.
2. Only use dates listed in "dates". Never schedule a topic after its examDate.
3. Never schedule a topic for more minutes than its remainingMinutes.
4. Every topic with remainingMinutes > 0 must either have at least one session or appear in "notScheduled" with a plain reason.
5. summary.neededMinutes and summary.availableMinutes must be copied exactly from "summary" in the input. Do not recalculate them.
6. Every topicId must be one of the topic ids in the input.
7. Session minutes are positive whole numbers.`;

const JUDGMENT = `Your judgment: put the weakest, highest-stakes topics first (low confidence, high difficulty, nearest exam). Do not blindly push everything to the next day. Spread work across days without overloading any day. If the work does not all fit, schedule what matters most and list the rest in "notScheduled" with an honest reason; never cram. In "explanation", write a short, plain, supportive paragraph that states the time needed versus the time available and explains what was prioritized, moved or left out, and why. In "changes", give one entry per topic that was moved, shortened or prioritized (or "unchanged").`;

export function buildPrompt({ mode, context, history, currentSessions, repairNotes }) {
  const input = {
    today: context.today,
    topics: context.topics,
    dates: context.dates,
    summary: context.summary,
    ...(mode === 'replan' ? { whatHappened: history, currentFutureSessions: currentSessions } : {}),
  };
  const task =
    mode === 'generate'
      ? 'Create a first study plan from today until the last exam.'
      : 'The student has fallen behind. Rebuild the REMAINING plan from today onwards. Sessions listed under "unconfirmed" are treated as missed for this replan.';
  const repair = repairNotes?.length
    ? `\n\nYour previous answer broke these rules. Fix every one and answer again:\n- ${repairNotes.join('\n- ')}`
    : '';
  return `You are the planning engine of a university exam study planner.\n${task}\n\n${RULES}\n\n${JUDGMENT}\n\nInput (JSON):\n${JSON.stringify(input, null, 2)}${repair}`;
}

let client;
function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new AiError('GEMINI_API_KEY is not set (put it in server/.env)');
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// One Gemini call. Returns the parsed (not yet validated) proposal object.
export async function proposePlan({ mode, context, history, currentSessions, repairNotes }) {
  const prompt = buildPrompt({ mode, context, history, currentSessions, repairNotes });
  const ai = getClient();
  let response;
  try {
    response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: proposalJsonSchema,
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });
  } catch (err) {
    throw new AiError(`Gemini request failed: ${err.message}`);
  }
  try {
    return { proposal: JSON.parse(response.text), raw: response.text };
  } catch {
    throw new AiError('Gemini did not return valid JSON');
  }
}
