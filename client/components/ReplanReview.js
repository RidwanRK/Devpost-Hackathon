'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { formatDate, formatMinutes } from '../lib/format';

const KIND_LABEL = {
  moved: 'Moved',
  shortened: 'Shortened',
  prioritized: 'Prioritized',
  added: 'Added',
  'not-scheduled': 'Not scheduled',
};

function Entries({ entries, empty }) {
  if (entries.length === 0) return <span className="muted">{empty}</span>;
  return (
    <>
      {entries.map((e, i) => (
        <div key={i}>
          {formatDate(e.date)} · {formatMinutes(e.minutes)}
          {e.missed && <span className="chip unconfirmed inline-chip">missed</span>}
        </div>
      ))}
    </>
  );
}

// The review: only the sessions that changed (original → revised), the honest numbers, the
// Not scheduled list with reasons, and the AI's explanation. Nothing changes until Accept.
export default function ReplanReview({ data, onChange }) {
  const { plan } = data;
  const pending = plan.pendingReplan;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const names = new Map();
  for (const s of plan.subjects) for (const t of s.topics) names.set(t.id, t.name);

  async function decide(call) {
    setBusy(true);
    setError('');
    try {
      await call();
      await onChange();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const { neededMinutes, availableMinutes } = pending.summary;
  return (
    <main className="page">
      <header className="topbar">
        <h1 className="brand">StudyFlow AI</h1>
      </header>

      <section>
        <h2>Your revised plan</h2>
        <p className="numbers">
          Time still needed: <strong>{formatMinutes(neededMinutes)}</strong> · Time available:{' '}
          <strong>{formatMinutes(availableMinutes)}</strong>
        </p>
        <p>{pending.explanation}</p>
      </section>

      <section>
        <h2>What changed</h2>
        {pending.affected.length === 0 ? (
          <p className="muted">No sessions changed.</p>
        ) : (
          <ul className="sessions">
            {pending.affected.map((a) => (
              <li className="session" key={a.topicId}>
                <div className="session-main">
                  <div>
                    <div className="session-title">{a.topicName}</div>
                    <div className="muted">{a.subjectName}</div>
                  </div>
                  <span className={`chip ${a.kind === 'not-scheduled' ? 'notscheduled' : 'completed'}`}>
                    {KIND_LABEL[a.kind]}
                  </span>
                </div>
                <div className="change">
                  <div>
                    <div className="change-label">Original</div>
                    <Entries entries={a.original} empty="Not in the plan" />
                  </div>
                  <div className="arrow" aria-hidden="true">→</div>
                  <div>
                    <div className="change-label">Revised</div>
                    <Entries entries={a.revised} empty="Not scheduled" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pending.notScheduled.length > 0 && (
        <section>
          <h2>Not scheduled</h2>
          <ul className="sessions">
            {pending.notScheduled.map((n) => (
              <li className="session" key={n.topicId}>
                <div className="session-main">
                  <div>
                    <div className="session-title">{names.get(n.topicId)}</div>
                    <div className="muted">{formatMinutes(n.minutes)} · {n.reason}</div>
                  </div>
                  <span className="chip notscheduled">Not scheduled</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="notice" role="alert">{error}</p>}
      <div className="nav">
        <button className="btn primary" disabled={busy} onClick={() => decide(api.acceptReplan)}>
          Accept revised plan
        </button>
        <button className="btn" disabled={busy} onClick={() => decide(api.discardReplan)}>
          Keep original plan
        </button>
      </div>
    </main>
  );
}
