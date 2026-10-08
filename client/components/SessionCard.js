'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { formatMinutes } from '../lib/format';

const STATUS_LABEL = {
  planned: 'Planned',
  completed: 'Completed',
  skipped: 'Skipped',
  partial: 'Partially completed',
  unconfirmed: 'Unconfirmed',
};

// One study session, with the actions to record what really happened.
// Unconfirmed is derived by the backend from the date, never stored.
export default function SessionCard({ session, topic, subjectName, unconfirmed, canRecord, onChange }) {
  const status = unconfirmed ? 'unconfirmed' : session.status;
  const [form, setForm] = useState(null); // null | 'completed' | 'partial'
  const [minutes, setMinutes] = useState('');
  const [confidence, setConfidence] = useState(topic?.confidence ?? 3);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(update) {
    setBusy(true);
    setError('');
    try {
      await api.updateSession(session.id, update);
      setForm(null);
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function open(kind) {
    setError('');
    setMinutes(session.actualMinutes === null ? '' : String(session.actualMinutes));
    setConfidence(session.confidenceAfter ?? topic?.confidence ?? 3);
    setForm(kind);
  }

  function submit(e) {
    e.preventDefault();
    const hasMinutes = minutes !== '';
    if (form === 'partial' && !hasMinutes) return setError('Enter how many minutes you studied.');
    if (hasMinutes && !(Number(minutes) >= 0 && Number(minutes) <= session.plannedMinutes)) {
      return setError(`Minutes must be between 0 and ${session.plannedMinutes}.`);
    }
    save({
      status: form,
      actualMinutes: hasMinutes ? Math.round(Number(minutes)) : null,
      confidenceAfter: Number(confidence),
    });
  }

  const recorded =
    (session.status === 'completed' || session.status === 'partial') &&
    `Studied ${formatMinutes(session.actualMinutes ?? session.plannedMinutes)} · confidence ${session.confidenceAfter ?? topic?.confidence}`;

  return (
    <li className="session">
      <div className="session-main">
        <div>
          <div className="session-title">{topic?.name ?? 'Unknown topic'}</div>
          <div className="muted">
            {subjectName} · {formatMinutes(session.plannedMinutes)} · {session.priority} priority
          </div>
          {recorded && <div className="muted">{recorded}</div>}
        </div>
        <span className={`chip ${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      {canRecord && (
        <div className="session-actions">
          <button className="btn small" aria-pressed={session.status === 'completed'} disabled={busy} onClick={() => open('completed')}>
            Completed
          </button>
          <button className="btn small" aria-pressed={session.status === 'partial'} disabled={busy} onClick={() => open('partial')}>
            Partially completed
          </button>
          <button className="btn small" aria-pressed={session.status === 'skipped'} disabled={busy} onClick={() => save({ status: 'skipped' })}>
            Skipped
          </button>
        </div>
      )}

      {form && (
        <form className="record" onSubmit={submit}>
          <label className="field small">
            Minutes studied
            <input
              type="number"
              min="0"
              max={session.plannedMinutes}
              placeholder={form === 'completed' ? String(session.plannedMinutes) : ''}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <label className="field small">
            Confidence now
            <select value={confidence} onChange={(e) => setConfidence(e.target.value)}>
              {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <button className="btn primary small" disabled={busy}>Save</button>
          <button type="button" className="btn quiet small" onClick={() => setForm(null)}>Cancel</button>
        </form>
      )}
      {error && <p className="notice">{error}</p>}
    </li>
  );
}
