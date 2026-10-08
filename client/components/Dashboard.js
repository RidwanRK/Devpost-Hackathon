'use client';

import { daysBetween, formatDate, formatMinutes } from '../lib/format';
import SessionCard from './SessionCard';
import StartOver from './StartOver';

// Today's sessions are the main focus; the overview shows the rest up to the last exam.
export default function Dashboard({ data, onChange }) {
  const { plan, today, unconfirmedIds } = data;
  const unconfirmed = new Set(unconfirmedIds);

  const topics = new Map();
  for (const s of plan.subjects) {
    for (const t of s.topics) topics.set(t.id, { topic: t, subjectName: s.name });
  }

  const todays = plan.sessions.filter((s) => s.date === today);
  const upcoming = plan.sessions.filter((s) => s.date > today);
  const byDate = Map.groupBy(upcoming, (s) => s.date);
  const exams = [...plan.subjects].sort((a, b) => a.examDate.localeCompare(b.examDate));
  const done = plan.sessions.filter((s) => s.status === 'completed').length;
  const total = plan.sessions.length;

  const card = (s) => (
    <SessionCard
      key={s.id}
      session={s}
      topic={topics.get(s.topicId)?.topic}
      subjectName={topics.get(s.topicId)?.subjectName}
      unconfirmed={unconfirmed.has(s.id)}
    />
  );

  return (
    <main className="page">
      <header className="topbar">
        <h1 className="brand">StudyFlow AI</h1>
        <div className="topbar-right">
          <span className="muted">Today · {formatDate(today)}</span>
          <StartOver onDone={onChange} />
        </div>
      </header>

      <section>
        <h2>Today</h2>
        {todays.length > 0 ? (
          <ul className="sessions">{todays.map(card)}</ul>
        ) : (
          <p className="muted">Nothing is planned for today.</p>
        )}
      </section>

      <section>
        <h2>Progress</h2>
        <div className="bar" role="img" aria-label={`${done} of ${total} sessions completed`}>
          <div className="bar-fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
        <p className="muted">
          {done} of {total} sessions completed · {total - done} unfinished
        </p>
      </section>

      <section>
        <h2>Upcoming exams</h2>
        <ul className="plain">
          {exams.map((s) => {
            const n = daysBetween(today, s.examDate);
            return (
              <li key={s.id}>
                <strong>{s.name}</strong> · {formatDate(s.examDate)} ·{' '}
                <span className="muted">{n === 1 ? 'tomorrow' : `in ${n} days`}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2>Overview</h2>
        {byDate.size === 0 ? (
          <p className="muted">No more sessions after today.</p>
        ) : (
          [...byDate].map(([date, sessions]) => (
            <div key={date} className="day">
              <h3>{formatDate(date)} <span className="muted">· {formatMinutes(sessions.reduce((n, s) => n + s.plannedMinutes, 0))}</span></h3>
              <ul className="sessions">{sessions.map(card)}</ul>
            </div>
          ))
        )}
      </section>

      {plan.notScheduled.length > 0 && (
        <section>
          <h2>Not scheduled</h2>
          <ul className="sessions">
            {plan.notScheduled.map((n) => (
              <li className="session" key={n.topicId}>
                <div>
                  <div className="session-title">{topics.get(n.topicId)?.topic.name}</div>
                  <div className="muted">{formatMinutes(n.minutes)} · {n.reason}</div>
                </div>
                <span className="chip notscheduled">Not scheduled</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.explanation && (
        <section>
          <h2>Why this plan</h2>
          <p>{plan.explanation}</p>
        </section>
      )}
    </main>
  );
}
