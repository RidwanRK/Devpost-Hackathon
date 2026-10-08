'use client';

import { useState } from 'react';
import { api } from '../lib/api';

// Clears the saved plan and returns to the welcome screen. Asks first.
export default function StartOver({ onDone }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    try {
      await api.startOver();
      await onDone();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!confirming) {
    return <button className="btn quiet" onClick={() => setConfirming(true)}>Start over</button>;
  }
  return (
    <span className="confirm">
      Clear everything and start again?
      <button className="btn danger" onClick={confirm}>Yes, clear it</button>
      <button className="btn quiet" onClick={() => setConfirming(false)}>Cancel</button>
      {error && <span className="notice inline">{error}</span>}
    </span>
  );
}
