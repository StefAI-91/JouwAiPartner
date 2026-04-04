'use client';

import { useEffect } from 'react';
import Userback from '@userback/widget';

export function UserbackProvider() {
  useEffect(() => {
    Userback('A-yzBT0sBbRpLUAfh9yVWo0jSgV')
      .then(() => console.log('[Userback] Widget loaded'))
      .catch((err) => console.error('[Userback] Error:', err));
  }, []);

  return null;
}
