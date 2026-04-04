'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Userback from '@userback/widget';
import type { UserbackWidget } from '@userback/widget';

const UserbackContext = createContext<UserbackWidget | null>(null);

export function UserbackProvider({ children }: { children: React.ReactNode }) {
  const [userback, setUserback] = useState<UserbackWidget | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_USERBACK_TOKEN || 'A-yzBT0sBbRpLUAfh9yVWo0jSgV';

    Userback(token, { autohide: false })
      .then(setUserback)
      .catch((err) => console.error('[Userback] Failed to initialize:', err));
  }, []);

  return (
    <UserbackContext.Provider value={userback}>
      {children}
    </UserbackContext.Provider>
  );
}

export const useUserback = () => useContext(UserbackContext);
