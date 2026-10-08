// The gatekeeper: checks an AI proposal against the hard rules.
// Pure functions. Returns a list of broken rules; an empty list means the proposal is valid.
import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');
const minutes = z.number().int().positive();

export const ProposalSchema = z.object({
  sessions: z.array(
    z.object({
      topicId: z.string(),
      date: dateString,
      minutes,
      priority: z.enum(['high', 'medium', 'low']),
    })
  ),
  notScheduled: z.array(z.object({ topicId: z.string(), minutes, reason: z.string().min(1) })),
  changes: z.array(
    z.object({
      topicId: z.string(),
      kind: z.enum(['moved', 'shortened', 'prioritized', 'unchanged']),
      reason: z.string(),
    })
  ),
  summary: z.object({
    neededMinutes: z.number().int().nonnegative(),
    availableMinutes: z.number().int().nonnegative(),
  }),
  explanation: z.string().min(1),
});

const broken = (rule, message) => ({ rule, message });

// `context` comes from scheduling.buildPlanningContext: { today, topics, capacityByDate, summary }.
export function validateProposal(proposal, context) {
  // Rule 1: the JSON has the expected shape. Nothing else can be checked if it does not.
  const parsed = ProposalSchema.safeParse(proposal);
  if (!parsed.success) {
    return parsed.error.issues.map((i) =>
      broken('shape', `${i.path.join('.') || 'proposal'}: ${i.message}`)
    );
  }
  const { sessions, notScheduled, changes, summary } = parsed.data;
  const errors = [];
  const topicById = new Map(context.topics.map((t) => [t.id, t]));

  // Rule 7: every topicId refers to a real topic.
  for (const [where, items] of [['sessions', sessions], ['notScheduled', notScheduled], ['changes', changes]]) {
    for (const item of items) {
      if (!topicById.has(item.topicId)) {
        errors.push(broken('unknown-topic', `${where} refers to unknown topicId "${item.topicId}"`));
      }
    }
  }
  const known = sessions.filter((s) => topicById.has(s.topicId));

  // Rule 2: no day's scheduled minutes exceed that day's available minutes.
  const perDate = new Map();
  for (const s of sessions) perDate.set(s.date, (perDate.get(s.date) ?? 0) + s.minutes);
  for (const [date, total] of perDate) {
    const capacity = context.capacityByDate[date] ?? 0;
    if (total > capacity) {
      errors.push(broken('day-capacity', `${date} has ${total} minutes scheduled but only ${capacity} available`));
    }
  }

  // Rule 3: nothing after the subject's exam date, nothing before today.
  for (const s of known) {
    const topic = topicById.get(s.topicId);
    if (s.date > topic.examDate) {
      errors.push(broken('after-exam', `"${topic.name}" is scheduled on ${s.date}, after its exam on ${topic.examDate}`));
    }
    if (s.date < context.today) {
      errors.push(broken('in-the-past', `"${topic.name}" is scheduled on ${s.date}, before today (${context.today})`));
    }
  }

  // Rule 4: no topic is scheduled for more minutes than its remaining work.
  const scheduledByTopic = new Map();
  for (const s of known) scheduledByTopic.set(s.topicId, (scheduledByTopic.get(s.topicId) ?? 0) + s.minutes);
  for (const [topicId, total] of scheduledByTopic) {
    const topic = topicById.get(topicId);
    if (total > topic.remainingMinutes) {
      errors.push(broken('over-remaining', `"${topic.name}" is scheduled for ${total} minutes but only ${topic.remainingMinutes} remain`));
    }
  }

  // Rule 5: every topic with remaining work is either scheduled or listed as not scheduled.
  const notScheduledIds = new Set(notScheduled.map((n) => n.topicId));
  for (const topic of context.topics) {
    if (topic.remainingMinutes > 0 && !scheduledByTopic.has(topic.id) && !notScheduledIds.has(topic.id)) {
      errors.push(broken('topic-unaccounted', `"${topic.name}" has ${topic.remainingMinutes} minutes of work left but is neither scheduled nor listed as not scheduled`));
    }
  }

  // Rule 6: the numbers the AI quoted equal the ones the backend calculated.
  for (const key of ['neededMinutes', 'availableMinutes']) {
    if (summary[key] !== context.summary[key]) {
      errors.push(broken('summary-mismatch', `${key} is ${summary[key]} but the app calculated ${context.summary[key]}`));
    }
  }

  return errors;
}
