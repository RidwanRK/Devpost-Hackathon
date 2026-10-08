'use client';

import SessionCard from './SessionCard';

// Shown when Replan is clicked while past sessions are still Unconfirmed. Nothing has been sent to
// the AI yet. The student can resolve each session here, or replan treating the rest as missed.
export default function ReplanConfirmDialog({ sessionIds, data, onChange, onReplan, onCancel }) {
  const { plan, unconfirmedIds } = data;
  const stillOpen = new Set(unconfirmedIds);
  const topics = new Map();
  for (const s of plan.subjects) for (const t of s.topics) topics.set(t.id, { topic: t, subjectName: s.name });
  const sessions = plan.sessions.filter((s) => sessionIds.includes(s.id));
  const remaining = sessions.filter((s) => stillOpen.has(s.id)).length;

  return (
    <section className="dialog" role="dialog" aria-labelledby="confirm-title">
      <h2 id="confirm-title">Before we replan</h2>
      <p>
        {sessions.length === 1 ? 'This session' : 'These sessions'} from an earlier day {sessions.length === 1 ? 'was' : 'were'} never
        marked. We won&apos;t assume you skipped {sessions.length === 1 ? 'it' : 'them'}: mark what really happened, or replan and
        treat the rest as missed for this replan only.
      </p>
      <ul className="sessions">
        {sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            topic={topics.get(s.topicId)?.topic}
            subjectName={topics.get(s.topicId)?.subjectName}
            unconfirmed={stillOpen.has(s.id)}
            canRecord
            onChange={onChange}
          />
        ))}
      </ul>
      <div className="nav">
        <button className="btn primary" disabled={remaining > 0} onClick={() => onReplan(false)}>
          Replan with these updates
        </button>
        <button className="btn" disabled={remaining === 0} onClick={() => onReplan(true)}>
          Replan anyway, treating the rest as missed
        </button>
        <button className="btn quiet" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}
