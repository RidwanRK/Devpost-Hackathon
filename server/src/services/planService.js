// The plan use-cases: load, save setup, generate, start over.
// The store and the AI call are injected so this can be tested without Atlas or Gemini.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { appDate, buildPlanningContext, isUnconfirmed } from './scheduling.js';
import { getValidProposal } from './planWorkflow.js';
import { SessionUpdateSchema, applySessionUpdate } from './sessionRules.js';

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const minutesPerDay = z.number().int().min(0).max(1440);

export const SetupSchema = z.object({
  availability: z.object({
    mon: minutesPerDay, tue: minutesPerDay, wed: minutesPerDay, thu: minutesPerDay,
    fri: minutesPerDay, sat: minutesPerDay, sun: minutesPerDay,
  }),
  subjects: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Every subject needs a name'),
        examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Every subject needs an exam date'),
        topics: z
          .array(
            z.object({
              name: z.string().trim().min(1, 'Every topic needs a name'),
              estimatedMinutes: z.number().int().min(15, 'Estimated time must be at least 15 minutes'),
              difficulty: z.number().int().min(1).max(5),
              confidence: z.number().int().min(1).max(5),
            })
          )
          .min(1, 'Every subject needs at least one topic'),
      })
    )
    .min(1, 'Add at least one subject'),
});

// What the website receives: the stored document without database internals.
function toClient(plan) {
  const { _id, __v, key, ...rest } = plan;
  return rest;
}

export function createPlanService({ store, propose, now = () => new Date() }) {
  const todayFor = (plan) => appDate(now(), plan?.demoDayOffset ?? 0);

  return {
    async getPlan() {
      const plan = await store.load();
      const today = todayFor(plan);
      return {
        plan: plan ? toClient(plan) : null,
        today,
        unconfirmedIds: plan ? plan.sessions.filter((s) => isUnconfirmed(s, today)).map((s) => s.id) : [],
      };
    },

    // Create or replace the setup. Replacing it clears any earlier sessions (the plan is regenerated).
    async saveSetup(body) {
      const parsed = SetupSchema.safeParse(body);
      if (!parsed.success) {
        throw new HttpError(400, 'invalid_setup', parsed.error.issues[0].message);
      }
      const existing = await store.load();
      const today = todayFor(existing);
      const setup = parsed.data;
      for (const s of setup.subjects) {
        if (s.examDate <= today) {
          throw new HttpError(400, 'invalid_setup', `The exam date for ${s.name} must be after today.`);
        }
      }
      const saved = await store.save({
        demoDayOffset: existing?.demoDayOffset ?? 0,
        availability: setup.availability,
        subjects: setup.subjects.map((s) => ({
          id: randomUUID(),
          name: s.name,
          examDate: s.examDate,
          topics: s.topics.map((t) => ({ id: randomUUID(), ...t })),
        })),
        sessions: [],
        notScheduled: [],
        explanation: '',
        editedSinceLastPlan: false,
        pendingReplan: null,
      });
      return toClient(saved);
    },

    // Ask the AI for the first plan, validate it (one repair attempt), and save the sessions.
    async generate() {
      const plan = await store.load();
      if (!plan) throw new HttpError(404, 'no_setup', 'Set up your subjects first.');
      const today = todayFor(plan);
      const context = buildPlanningContext({ plan: { ...plan, sessions: [] }, today });
      if (context.summary.availableMinutes === 0) {
        throw new HttpError(400, 'no_time', 'There is no study time available before your exams. Check your availability and exam dates.');
      }
      const proposal = await getValidProposal({ mode: 'generate', context, propose });
      const saved = await store.save({
        ...plan,
        sessions: proposal.sessions
          .map((s) => ({
            id: randomUUID(),
            topicId: s.topicId,
            date: s.date,
            plannedMinutes: s.minutes,
            priority: s.priority,
            status: 'planned',
            actualMinutes: null,
            confidenceAfter: null,
          }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        notScheduled: proposal.notScheduled,
        explanation: proposal.explanation,
        editedSinceLastPlan: false,
        pendingReplan: null,
      });
      return toClient(saved);
    },

    // Record what happened in a session. A confidence update also updates the topic, so the
    // next replan uses the student's latest sense of the topic.
    async updateSession(id, body) {
      const parsed = SessionUpdateSchema.safeParse(body);
      if (!parsed.success) throw new HttpError(400, 'invalid_session', 'That update is not valid.');
      const plan = await store.load();
      const index = plan?.sessions.findIndex((s) => s.id === id) ?? -1;
      if (index === -1) throw new HttpError(404, 'no_session', 'That session no longer exists.');
      const result = applySessionUpdate(plan.sessions[index], parsed.data);
      if (result.error) throw new HttpError(400, 'invalid_session', result.error);
      plan.sessions[index] = result.session;
      if (result.session.confidenceAfter !== null) {
        for (const subject of plan.subjects) {
          for (const topic of subject.topics) {
            if (topic.id === result.session.topicId) topic.confidence = result.session.confidenceAfter;
          }
        }
      }
      return toClient(await store.save(plan));
    },

    // Demo clock: move the app date forward one day so "Day 1 missed, replan on Day 2" can be shown.
    async advanceDay() {
      const plan = await store.load();
      if (!plan) throw new HttpError(404, 'no_setup', 'Set up your subjects first.');
      plan.demoDayOffset += 1;
      return toClient(await store.save(plan));
    },

    async clear() {
      await store.clear();
    },
  };
}
