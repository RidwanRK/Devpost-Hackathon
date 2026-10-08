import { setup, EXAM } from './fixtures/canonical.js';

// Setup as the website sends it: no ids yet.
export const body = {
  availability: setup.availability,
  subjects: [
    {
      name: 'Database Systems',
      examDate: EXAM,
      topics: setup.subjects[0].topics.map(({ id, ...t }) => t),
    },
  ],
};

export const now = () => new Date(2026, 2, 2, 9, 0); // Day 1

export function memoryStore() {
  let doc = null;
  return {
    async load() { return doc && structuredClone(doc); },
    async save(plan) { doc = structuredClone(plan); return structuredClone(doc); },
    async clear() { doc = null; },
  };
}

// A stand-in for Gemini: fills each day with the weakest topics first. Always valid.
export function greedyAi(context) {
  const left = Object.fromEntries(context.topics.map((t) => [t.id, t.remainingMinutes]));
  const order = [...context.topics].sort((a, b) => a.confidence - b.confidence);
  const sessions = [];
  for (const { date, availableMinutes } of context.dates) {
    let room = availableMinutes;
    for (const t of order) {
      const minutes = Math.min(room, left[t.id]);
      if (minutes > 0) {
        sessions.push({ topicId: t.id, date, minutes, priority: 'high' });
        left[t.id] -= minutes;
        room -= minutes;
      }
    }
  }
  return { sessions, notScheduled: [], changes: [], summary: context.summary, explanation: 'ok' };
}

export const okAi = async ({ context }) => ({ proposal: greedyAi(context), raw: '' });

