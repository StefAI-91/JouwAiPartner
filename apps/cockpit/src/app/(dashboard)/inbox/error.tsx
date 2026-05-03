"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// CC-008 — error-boundary logt de error zodat de oorzaak via console / Vercel-
// logs traceerbaar blijft. `error.digest` is Next's gemaskeerde id in productie.
export default function InboxError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[inbox/error]", error);
  }, [error]);

  return (
    <div className="px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Inbox kon niet laden</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Probeer het opnieuw — als het blijft falen, check de console voor de foutmelding.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
