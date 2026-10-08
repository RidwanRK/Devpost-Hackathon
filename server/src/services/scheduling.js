// Pure scheduling helpers: no database, no AI. All times are minutes; dates are YYYY-MM-DD strings.

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function toUtc(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(dateStr, n) {
  return new Date(toUtc(dateStr) + n * 86400000).toISOString().slice(0, 10);
}

export function weekdayKey(dateStr) {
  return WEEKDAYS[new Date(toUtc(dateStr)).getUTCDay()];
}

// The "app date": the real local date plus the demo clock offset.
export function appDate(now = new Date(), demoDayOffset = 0) {
  const pad = (n) => String(n).padStart(2, '0');
  const real = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return addDays(real, demoDayOffset);
}

// Dates from `from` up to (and including) `to`.
function dateRange(from, to) {
  const dates = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  return dates;
}

function allTopics(subjects) {
  return subjects.flatMap((s) =>
    s.topics.map((t) => ({ ...t, subjectId: s.id, subjectName: s.name, examDate: s.examDate }))
  );
}

// Minutes of a session that count as real work done.
// Completed: actual minutes, or the planned minutes if none were entered.
// Partial: exactly the actual minutes. Skipped and still-planned (incl. Unconfirmed): nothing.
export function creditedMinutes(session) {
  if (session.status === 'completed') return session.actualMinutes ?? session.plannedMinutes;
  if (session.status === 'partial') return session.actualMinutes ?? 0;
  return 0;
}

export function remainingMinutes(topic, sessions) {
  const credited = sessions
    .filter((s) => s.topicId === topic.id)
    .reduce((sum, s) => sum + creditedMinutes(s), 0);
  return Math.max(0, topic.estimatedMinutes - credited);
}

// Past session the student never marked. Derived from the date, never stored.
export function isUnconfirmed(session, today) {
  return session.status === 'planned' && session.date < today;
}

// Available study dates: today up to the day before the last exam.
// (The exam day itself is not a study day.) Each date carries its availability in minutes,
// minus work already done that day, so a replan on the same day does not double-book it.
export function availableDates({ availability, subjects, sessions = [], today }) {
  const lastExam = subjects.map((s) => s.examDate).sort().at(-1);
  if (!lastExam) return [];
  return dateRange(today, addDays(lastExam, -1)).map((date) => {
    const done = sessions
      .filter((s) => s.date === date)
      .reduce((sum, s) => sum + creditedMinutes(s), 0);
    const availableMinutes = Math.max(0, (availability[weekdayKey(date)] ?? 0) - done);
    return { date, availableMinutes };
  });
}

// Everything the AI planner and the validator need, computed by the backend (never by the AI).
export function buildPlanningContext({ plan, today }) {
  const sessions = plan.sessions ?? [];
  const topics = allTopics(plan.subjects).map((t) => ({
    id: t.id,
    name: t.name,
    subjectId: t.subjectId,
    subjectName: t.subjectName,
    examDate: t.examDate,
    difficulty: t.difficulty,
    confidence: t.confidence,
    estimatedMinutes: t.estimatedMinutes,
    remainingMinutes: remainingMinutes(t, sessions),
  }));
  const dates = availableDates({ ...plan, sessions, today });
  const capacityByDate = Object.fromEntries(dates.map((d) => [d.date, d.availableMinutes]));
  const summary = {
    neededMinutes: topics.reduce((sum, t) => sum + t.remainingMinutes, 0),
    availableMinutes: dates.reduce((sum, d) => sum + d.availableMinutes, 0),
  };
  return { today, topics, dates, capacityByDate, summary };
}

// What happened so far, for the AI's context. Unconfirmed sessions are reported as such;
// whether they count as missed is the replan's decision.
export function describeHistory({ plan, today }) {
  const byTopic = (s) => ({
    topicId: s.topicId,
    date: s.date,
    plannedMinutes: s.plannedMinutes,
    actualMinutes: s.actualMinutes ?? null,
  });
  const sessions = plan.sessions ?? [];
  return {
    skipped: sessions.filter((s) => s.status === 'skipped').map(byTopic),
    partial: sessions.filter((s) => s.status === 'partial').map(byTopic),
    unconfirmed: sessions.filter((s) => isUnconfirmed(s, today)).map(byTopic),
  };
}
