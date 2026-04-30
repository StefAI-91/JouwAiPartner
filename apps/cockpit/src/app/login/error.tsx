"use client";

import { useEffect } from "react";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-xl font-semibold">Er ging iets mis</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          De loginpagina kon niet worden geladen. Probeer het opnieuw.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Opnieuw proberen
        </button>
      </div>
    </div>
  );
}
