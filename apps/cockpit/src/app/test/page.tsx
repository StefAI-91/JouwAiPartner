'use client';

import { useEffect, useState } from 'react';
import Userback from '@userback/widget';

export default function TestPage() {
  const [status, setStatus] = useState('Loading Userback...');

  useEffect(() => {
    Userback('A-yzBT0sBbRpLUAfh9yVWo0jSgV')
      .then(() => setStatus('Userback loaded successfully!'))
      .catch((err) => setStatus(`Userback error: ${err.message || err}`));
  }, []);

  return (
    <div style={{ padding: 40, fontSize: 18 }}>
      <h1>Userback Test</h1>
      <p>{status}</p>
    </div>
  );
}
