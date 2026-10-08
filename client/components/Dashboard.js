'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { daysBetween, formatDate, formatMinutes } from '../lib/format';
import SessionCard from './SessionCard';
import StartOver from './StartOver';
import DemoClockControl from './DemoClockControl';
import ReplanConfirmDialog from './ReplanConfirmDialog';

// Today's sessions are the main focus; the overview shows the rest up to the last exam.
export default function Dashboard({ data, onChange }) {
  const { plan, today, unconfirmedIds } = data;
  const unconfirmed = new Set(unconfirmedIds);
  const [phase, setPhase] = useState('idle'); // idle | confirm | loading
  const [confirmIds, setConfirmIds] = useState([]);
  const [lastChoice, setLastChoice] = useState(false);
  const [replanError, setReplanError] = useState('');

  function startReplan() {
    setReplanError('');
    if (unconfirmedIds.length > 0) {
      setConfirmIds(unconfirmedIds);
      setPhase('confirm');
    } else {
      runReplan(false);
    }
  }

  // On success the plan now carries a pending proposal and the app shell shows the review.
  async function runReplan(treatUnconfirmedAsMissed) {
    setLastChoice(treatUnconfirmedAsMissed);
    setReplanError('');
    setPhase('loading');
    try {
      await api.replan(treatUnconfirmedAsMissed);
      await onChange();
    } catch (err) {
      setReplanError(err.message);
      setPhase('idle');
    }
  }

  const topics = new Map();
  for (const s of plan.subjects) {
    for (const t of s.topics) topics.set(t.id, { topic: t, subjectName: s.name });
  }

  const earlier = plan.sessions.filter((s) => s.date < today);
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
      canRecord={s.date <= today}
      onChange={onChange}
    />
  );

  if (phase === 'loading') {
    return (
      <main className="page narrow">
        <h1 className="brand">StudyFlow AI</h1>
        <section className="loading" role="status">
          <h2>Rebuilding your plan…</h2>
          <p className="muted">
            Looking at what you actually did, what&apos;s left, and the time you have. This can take a few seconds.
          </p>
        </section>
      </main>
    );
  }

  if (phase === 'confirm') {
    return (
      <main className="page narrow">
        <h1 className="brand">StudyFlow AI</h1>
        <ReplanConfirmDialog
          sessionIds={confirmIds}
          data={data}
          onChange={onChange}
          onReplan={runReplan}
          onCancel={() => setPhase('idle')}
        />
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <h1 className="brand">StudyFlow AI</h1>
        <div className="topbar-right">
          <StartOver onDone={onChange} />
        </div>
      </header>

      <DemoClockControl today={today} daysAdvanced={plan.demoDayOffset} onChange={onChange} />

      {earlier.length > 0 && (
        <section>
          <h2>Earlier</h2>
          <ul className="sessions">{earlier.map(card)}</ul>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Today · {formatDate(today)}</h2>
          <button className="btn primary" onClick={startReplan}>Replan My Schedule</button>
        </div>
        {replanError && (
          <div className="notice" role="alert">
            {replanError}{' '}
            <button className="btn small" onClick={() => runReplan(lastChoice)}>Retry</button>
          </div>
        )}
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
