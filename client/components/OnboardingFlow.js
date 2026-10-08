'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { addDays } from '../lib/format';

const DAYS = [
  ['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'],
  ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday'],
];
const WEEKEND = ['sat', 'sun'];
const RATINGS = [1, 2, 3, 4, 5];

let nextKey = 1;
const newTopic = () => ({ key: nextKey++, name: '', hours: '2', difficulty: 3, confidence: 3 });
const newSubject = () => ({ key: nextKey++, name: '', examDate: '', topics: [newTopic()] });

const STEPS = ['Welcome', 'Subjects', 'Exams and topics', 'Availability', 'Generate'];

export default function OnboardingFlow({ today, onDone }) {
  const [step, setStep] = useState(0);
  const [subjects, setSubjects] = useState([newSubject()]);
  const [weekdayHours, setWeekdayHours] = useState('2');
  const [weekendHours, setWeekendHours] = useState('2');
  const [overrides, setOverrides] = useState({}); // day -> hours string, only for customised days
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  const minExam = addDays(today, 1);
  const hoursFor = (day) => overrides[day] ?? (WEEKEND.includes(day) ? weekendHours : weekdayHours);

  const updateSubject = (key, patch) =>
    setSubjects((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const updateTopic = (subjectKey, topicKey, patch) =>
    setSubjects((list) =>
      list.map((s) =>
        s.key === subjectKey
          ? { ...s, topics: s.topics.map((t) => (t.key === topicKey ? { ...t, ...patch } : t)) }
          : s
      )
    );

  function check() {
    if (step === 1) {
      if (!subjects.some((s) => s.name.trim())) return 'Add at least one subject.';
      if (subjects.some((s) => !s.name.trim())) return 'Give every subject a name, or remove the empty one.';
    }
    if (step === 2) {
      for (const s of subjects) {
        if (!s.examDate || s.examDate < minExam) return `Pick an exam date after today for ${s.name}.`;
        if (s.topics.length === 0) return `Add at least one topic for ${s.name}.`;
        for (const t of s.topics) {
          if (!t.name.trim()) return `Give every topic in ${s.name} a name.`;
          if (!(Number(t.hours) >= 0.25)) return `Estimated time for "${t.name}" must be at least 0.25 hours.`;
        }
      }
    }
    if (step === 3) {
      const values = DAYS.map(([d]) => Number(hoursFor(d)));
      if (values.some((v) => !(v >= 0 && v <= 24))) return 'Hours per day must be between 0 and 24.';
      if (values.every((v) => v === 0)) return 'You need at least some study time on at least one day.';
    }
    return '';
  }

  function next() {
    const message = check();
    setProblem(message);
    if (!message) setStep(step + 1);
  }

  async function generate() {
    setBusy(true);
    setProblem('');
    try {
      await api.saveSetup({
        availability: Object.fromEntries(DAYS.map(([d]) => [d, Math.round(Number(hoursFor(d)) * 60)])),
        subjects: subjects.map((s) => ({
          name: s.name.trim(),
          examDate: s.examDate,
          topics: s.topics.map((t) => ({
            name: t.name.trim(),
            estimatedMinutes: Math.round(Number(t.hours) * 60),
            difficulty: Number(t.difficulty),
            confidence: Number(t.confidence),
          })),
        })),
      });
      await api.generatePlan();
      await onDone();
    } catch (err) {
      setProblem(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="page narrow">
      <h1 className="brand">StudyFlow AI</h1>
      <p className="step-label">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>

      {step === 0 && (
        <section>
          <h2>A study plan that adapts when you fall behind.</h2>
          <p>
            Tell StudyFlow about your exams, your topics and the time you really have. It builds a realistic
            plan, and when life gets in the way, it rebuilds the rest and tells you honestly what fits.
          </p>
          <p className="muted">This takes about two minutes.</p>
        </section>
      )}

      {step === 1 && (
        <section>
          <h2>Which subjects are you studying for?</h2>
          {subjects.map((s, i) => (
            <div className="row" key={s.key}>
              <input
                aria-label={`Subject ${i + 1} name`}
                placeholder="e.g. Database Systems"
                value={s.name}
                onChange={(e) => updateSubject(s.key, { name: e.target.value })}
              />
              {subjects.length > 1 && (
                <button className="btn quiet" onClick={() => setSubjects((l) => l.filter((x) => x.key !== s.key))}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <button className="btn quiet" onClick={() => setSubjects((l) => [...l, newSubject()])}>
            + Add another subject
          </button>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2>When is each exam, and what do you need to cover?</h2>
          {subjects.map((s) => (
            <fieldset key={s.key}>
              <legend>{s.name}</legend>
              <label className="field">
                Exam date
                <input
                  type="date"
                  min={minExam}
                  value={s.examDate}
                  onChange={(e) => updateSubject(s.key, { examDate: e.target.value })}
                />
              </label>
              {s.topics.map((t) => (
                <div className="topic" key={t.key}>
                  <label className="field grow">
                    Topic
                    <input
                      placeholder="e.g. Transaction Scheduling"
                      value={t.name}
                      onChange={(e) => updateTopic(s.key, t.key, { name: e.target.value })}
                    />
                  </label>
                  <label className="field small">
                    Hours needed
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={t.hours}
                      onChange={(e) => updateTopic(s.key, t.key, { hours: e.target.value })}
                    />
                  </label>
                  <label className="field small">
                    Difficulty
                    <select value={t.difficulty} onChange={(e) => updateTopic(s.key, t.key, { difficulty: e.target.value })}>
                      {RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="field small">
                    Confidence
                    <select value={t.confidence} onChange={(e) => updateTopic(s.key, t.key, { confidence: e.target.value })}>
                      {RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  {s.topics.length > 1 && (
                    <button
                      className="btn quiet"
                      aria-label={`Remove topic ${t.name || ''}`}
                      onClick={() => updateSubject(s.key, { topics: s.topics.filter((x) => x.key !== t.key) })}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button className="btn quiet" onClick={() => updateSubject(s.key, { topics: [...s.topics, newTopic()] })}>
                + Add a topic
              </button>
            </fieldset>
          ))}
          <p className="muted">Difficulty: 1 = easy, 5 = very hard. Confidence: 1 = not confident, 5 = very confident.</p>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2>How many hours can you study each day?</h2>
          <div className="topic">
            <label className="field small">
              Weekdays (hours)
              <input type="number" min="0" max="24" step="0.5" value={weekdayHours} onChange={(e) => { setWeekdayHours(e.target.value); setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([d]) => WEEKEND.includes(d)))); }} />
            </label>
            <label className="field small">
              Weekends (hours)
              <input type="number" min="0" max="24" step="0.5" value={weekendHours} onChange={(e) => { setWeekendHours(e.target.value); setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([d]) => !WEEKEND.includes(d)))); }} />
            </label>
          </div>
          <details>
            <summary>Customise individual days</summary>
            <div className="days">
              {DAYS.map(([d, label]) => (
                <label className="field small" key={d}>
                  {label}
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={hoursFor(d)}
                    onChange={(e) => setOverrides((o) => ({ ...o, [d]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          </details>
        </section>
      )}

      {step === 4 && (
        <section>
          <h2>Ready when you are.</h2>
          <ul className="summary">
            {subjects.map((s) => (
              <li key={s.key}>
                <strong>{s.name}</strong> · exam {s.examDate} · {s.topics.length} topic{s.topics.length === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
          <button className="btn primary" disabled={busy} onClick={generate}>
            {busy ? 'Building your plan…' : 'Generate My Study Plan'}
          </button>
          {busy && <p className="muted">The AI is working out what to study first. This can take a few seconds.</p>}
        </section>
      )}

      {problem && <p className="notice" role="alert">{problem}</p>}

      <div className="nav">
        {step > 0 && (
          <button className="btn quiet" disabled={busy} onClick={() => { setProblem(''); setStep(step - 1); }}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button className="btn primary" onClick={next}>
            {step === 0 ? 'Get started' : 'Next'}
          </button>
        )}
      </div>
    </main>
  );
}
