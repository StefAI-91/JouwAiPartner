'use client';

import Script from 'next/script';

declare global {
  interface Window {
    Userback?: Record<string, unknown>;
  }
}

const USERBACK_TOKEN = process.env.NEXT_PUBLIC_USERBACK_TOKEN || 'A-yzBT0sBbRpLUAfh9yVWo0jSgV';

export function UserbackProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="userback-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.Userback = window.Userback || {};
            Userback.access_token = "${USERBACK_TOKEN}";
          `,
        }}
      />
      <Script
        src="https://static.userback.io/widget/v1.js"
        strategy="afterInteractive"
      />
      {children}
    </>
  );
}
