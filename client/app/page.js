'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import OnboardingFlow from '../components/OnboardingFlow';
import Dashboard from '../components/Dashboard';

// The app shell: ask the backend for the plan, then show onboarding or the dashboard.
// The database is the source of truth; this component only holds a copy in memory.
export default function Home() {
  const [data, setData] = useState(null); // { plan, today, unconfirmedIds }
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setData(await api.getPlan());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    return (
      <main className="page narrow">
        <h1 className="brand">StudyFlow AI</h1>
        {error ? (
          <>
            <p className="notice">{error}</p>
            <button className="btn" onClick={load}>Try again</button>
          </>
        ) : (
          <p className="muted">Loading…</p>
        )}
      </main>
    );
  }

  const hasPlan = data.plan && data.plan.sessions.length > 0;
  return hasPlan ? (
    <Dashboard data={data} onChange={load} />
  ) : (
    <OnboardingFlow today={data.today} onDone={load} />
  );
}
