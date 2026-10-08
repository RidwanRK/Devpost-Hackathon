import { formatMinutes } from '../lib/format';

const STATUS_LABEL = {
  planned: 'Planned',
  completed: 'Completed',
  skipped: 'Skipped',
  partial: 'Partially completed',
  unconfirmed: 'Unconfirmed',
};

// One study session. Unconfirmed is derived by the backend from the date, not stored.
export default function SessionCard({ session, topic, subjectName, unconfirmed }) {
  const status = unconfirmed ? 'unconfirmed' : session.status;
  return (
    <li className="session">
      <div>
        <div className="session-title">{topic?.name ?? 'Unknown topic'}</div>
        <div className="muted">
          {subjectName} · {formatMinutes(session.plannedMinutes)} · {session.priority} priority
        </div>
      </div>
      <span className={`chip ${status}`}>{STATUS_LABEL[status]}</span>
    </li>
  );
}
