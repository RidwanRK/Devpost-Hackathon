// The replan workflow: gather inputs, ask the AI, validate (one repair attempt), work out which
// sessions changed, keep the proposal as "pending", then accept or discard it.
// The AI proposes; this code decides whether it may be shown, and calculates every number.
import { randomUUID } from 'node:crypto';
import {
  appDate, buildPlanningContext, describeHistory, isUnconfirmed,
} from './scheduling.js';
import { getValidProposal, PlanFailedError } from './planWorkflow.js';
import { HttpError, toClient } from './planService.js';

const FAILED_MESSAGE = "We couldn't generate your revised plan. Your current schedule is safe—please try again.";

const asEntry = (s) => ({ date: s.date, minutes: s.plannedMinutes ?? s.minutes, priority: s.priority });
const sameEntries = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Compare the sessions being replaced (old) with the proposal (new), topic by topic.
// "Old" means sessions that are still planned and either today-or-later, or past and Unconfirmed
// (treated as missed for this replan). Topics whose sessions are identical are not "affected".
export function computeAffected({ oldSessions, newSessions, topics, today }) {
  const replaced = oldSessions.filter((s) => s.status === 'planned');
  const affected = [];
  for (const topic of topics) {
    const original = replaced
      .filter((s) => s.topicId === topic.id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({ ...asEntry(s), missed: isUnconfirmed(s, today) }));
    const revised = newSessions
      .filter((s) => s.topicId === topic.id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(asEntry);
    const strip = (entries) => entries.map(({ date, minutes, priority }) => ({ date, minutes, priority }));
    if (sameEntries(strip(original), revised)) continue;

    const total = (entries) => entries.reduce((n, e) => n + e.minutes, 0);
    let kind;
    if (revised.length === 0) kind = 'not-scheduled';
    else if (original.length === 0) kind = 'added';
    else if (total(revised) < total(original)) kind = 'shortened';
    else if (!sameEntries(strip(original).map((e) => e.date), revised.map((e) => e.date))) kind = 'moved';
    else kind = 'prioritized';

    affected.push({
      topicId: topic.id,
      topicName: topic.name,
      subjectName: topic.subjectName,
      kind,
      original,
      revised,
    });
  }
  const firstDate = (a) => (a.revised[0] ?? a.original[0]).date;
  return affected.sort((a, b) => firstDate(a).localeCompare(firstDate(b)));
}

// Accepting swaps every still-planned session dated today or later for the proposal's sessions.
// All history stays, and past Unconfirmed sessions stay Unconfirmed.
export function applyAccepted(plan, pending) {
  const today = pending.today;
  const kept = plan.sessions.filter((s) => !(s.status === 'planned' && s.date >= today));
  return {
    ...plan,
    sessions: [...kept, ...pending.sessions].sort((a, b) => a.date.localeCompare(b.date)),
    notScheduled: pending.notScheduled,
    explanation: pending.explanation,
    editedSinceLastPlan: false,
    pendingReplan: null,
  };
}

export function createReplanService({ store, propose, now = () => new Date() }) {
  const todayFor = (plan) => appDate(now(), plan.demoDayOffset ?? 0);

  return {
    async replan({ treatUnconfirmedAsMissed = false } = {}) {
      const plan = await store.load();
      if (!plan || plan.sessions.length === 0) throw new HttpError(404, 'no_plan', 'There is no plan to replan yet.');
      const today = todayFor(plan);
      const unconfirmed = plan.sessions.filter((s) => isUnconfirmed(s, today));
      if (unconfirmed.length > 0 && !treatUnconfirmedAsMissed) {
        throw new HttpError(409, 'needs_confirmation', 'Some past sessions are still Unconfirmed. Resolve them or replan treating them as missed.');
      }

      const context = buildPlanningContext({ plan, today });
      const history = describeHistory({ plan, today });
      const currentSessions = plan.sessions
        .filter((s) => s.status === 'planned' && s.date >= today)
        .map((s) => ({ topicId: s.topicId, date: s.date, minutes: s.plannedMinutes, priority: s.priority }));

      let proposal;
      try {
        proposal = await getValidProposal({ mode: 'replan', context, history, currentSessions, propose });
      } catch (err) {
        if (err instanceof PlanFailedError) {
          console.error('Replan failed:', err.message, err.brokenRules);
          throw new HttpError(502, 'plan_failed', FAILED_MESSAGE);
        }
        throw err;
      }

      const sessions = proposal.sessions
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
        .sort((a, b) => a.date.localeCompare(b.date));

      const pending = {
        today,
        sessions,
        notScheduled: proposal.notScheduled,
        affected: computeAffected({ oldSessions: plan.sessions, newSessions: sessions, topics: context.topics, today }),
        // The numbers come from the backend, never from the AI's own arithmetic.
        summary: context.summary,
        explanation: proposal.explanation,
        createdAt: now().toISOString(),
      };
      const saved = await store.save({ ...plan, pendingReplan: pending });
      return toClient(saved);
    },

    async accept() {
      const plan = await store.load();
      if (!plan?.pendingReplan) throw new HttpError(404, 'no_pending', 'There is no revised plan waiting for review.');
      if (plan.pendingReplan.today !== todayFor(plan)) {
        throw new HttpError(409, 'stale', 'The date changed since this proposal was made. Please replan again.');
      }
      return toClient(await store.save(applyAccepted(plan, plan.pendingReplan)));
    },

    async discard() {
      const plan = await store.load();
      if (!plan) throw new HttpError(404, 'no_plan', 'There is no plan.');
      return toClient(await store.save({ ...plan, pendingReplan: null }));
    },
  };
}
