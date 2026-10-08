'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';

// Simulated time for demos: moves the app date forward one day so "Day 1 missed, replan on
// Day 2" can be shown in one sitting. Clearly labelled; Start Over resets it.
export default function DemoClockControl({ today, daysAdvanced, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function advance() {
    setBusy(true);
    setError('');
    try {
      await api.advanceDay();
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="demo-clock">
      <span>
        <strong>Demo clock</strong> · app date {formatDate(today)}
        {daysAdvanced > 0 && <span className="muted"> (simulated, +{daysAdvanced} day{daysAdvanced === 1 ? '' : 's'})</span>}
      </span>
      <button className="btn small" disabled={busy} onClick={advance}>Advance one day</button>
      {error && <span className="notice inline">{error}</span>}
    </div>
  );
}
