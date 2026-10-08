// TEST-ONLY data: the PRD's canonical demo scenario (prd.md > Canonical Demo Scenario).
// The running app never uses this; it always calls the real AI.

export const DAY1 = '2026-03-02';
export const DAY2 = '2026-03-03';
export const DAY3 = '2026-03-04';
export const EXAM = '2026-03-05'; // Day 4

const hours2 = 120;

export const setup = {
  availability: { mon: hours2, tue: hours2, wed: hours2, thu: hours2, fri: hours2, sat: hours2, sun: hours2 },
  subjects: [
    {
      id: 's-db',
      name: 'Database Systems',
      examDate: EXAM,
      topics: [
        { id: 't-trans', name: 'Transaction Scheduling', estimatedMinutes: 120, difficulty: 5, confidence: 1 },
        { id: 't-norm', name: 'Normalization', estimatedMinutes: 120, difficulty: 4, confidence: 2 },
        { id: 't-arch', name: 'Database Architecture', estimatedMinutes: 120, difficulty: 2, confidence: 4 },
      ],
    },
  ],
};

// The original plan: one 2-hour topic per day.
export const originalSessions = [
  { id: 'x1', topicId: 't-trans', date: DAY1, plannedMinutes: 120, priority: 'high', status: 'planned', actualMinutes: null, confidenceAfter: null },
  { id: 'x2', topicId: 't-norm', date: DAY2, plannedMinutes: 120, priority: 'high', status: 'planned', actualMinutes: null, confidenceAfter: null },
  { id: 'x3', topicId: 't-arch', date: DAY3, plannedMinutes: 120, priority: 'low', status: 'planned', actualMinutes: null, confidenceAfter: null },
];

// Day 1 first plan, as the AI is expected to return it.
export const cannedGenerateResponse = {
  sessions: [
    { topicId: 't-trans', date: DAY1, minutes: 120, priority: 'high' },
    { topicId: 't-norm', date: DAY2, minutes: 120, priority: 'high' },
    { topicId: 't-arch', date: DAY3, minutes: 120, priority: 'low' },
  ],
  notScheduled: [],
  changes: [],
  summary: { neededMinutes: 360, availableMinutes: 360 },
  explanation: 'You need 6 hours and have 6 hours, so everything fits. The weakest topic comes first.',
};

// Day 2, Transaction Scheduling never marked (Unconfirmed). 6 hours needed, 4 available.
export const cannedReplanResponse = {
  sessions: [
    { topicId: 't-trans', date: DAY2, minutes: 120, priority: 'high' },
    { topicId: 't-norm', date: DAY3, minutes: 120, priority: 'high' },
  ],
  notScheduled: [
    { topicId: 't-arch', minutes: 120, reason: 'Strongest topic (confidence 4) and the lowest priority; it did not fit.' },
  ],
  changes: [
    { topicId: 't-trans', kind: 'moved', reason: 'Missed on Day 1, lowest confidence, so it goes first.' },
    { topicId: 't-norm', kind: 'moved', reason: 'Moved to Day 3 to make room.' },
  ],
  summary: { neededMinutes: 360, availableMinutes: 240 },
  explanation: 'You need 6 hours but only have 4. I prioritized Transaction Scheduling and Normalization because your confidence is lowest there. Database Architecture did not fit; review its key concepts if time permits.',
};

// Hand-broken variants of the replan answer, one per hard rule.
export const brokenResponses = {
  'day-capacity': {
    ...cannedReplanResponse,
    sessions: [
      { topicId: 't-trans', date: DAY2, minutes: 120, priority: 'high' },
      { topicId: 't-norm', date: DAY2, minutes: 120, priority: 'high' },
    ],
  },
  'after-exam': {
    ...cannedReplanResponse,
    sessions: [{ topicId: 't-trans', date: '2026-03-06', minutes: 60, priority: 'high' }],
  },
  'in-the-past': {
    ...cannedReplanResponse,
    sessions: [{ topicId: 't-trans', date: DAY1, minutes: 120, priority: 'high' }],
  },
  'over-remaining': {
    ...cannedReplanResponse,
    sessions: [
      { topicId: 't-trans', date: DAY2, minutes: 120, priority: 'high' },
      { topicId: 't-norm', date: DAY3, minutes: 150, priority: 'high' },
    ],
  },
  'topic-unaccounted': { ...cannedReplanResponse, notScheduled: [] },
  'summary-mismatch': { ...cannedReplanResponse, summary: { neededMinutes: 360, availableMinutes: 300 } },
  'unknown-topic': {
    ...cannedReplanResponse,
    changes: [...cannedReplanResponse.changes, { topicId: 't-nope', kind: 'moved', reason: 'made up' }],
  },
  shape: { ...cannedReplanResponse, explanation: undefined },
};
