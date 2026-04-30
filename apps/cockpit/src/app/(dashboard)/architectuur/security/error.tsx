"use client";

import { useEffect } from "react";

export default function SecurityError({
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
    <div className="px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Security-overzicht niet beschikbaar</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        De integratie- en datamapping-secties konden niet worden weergegeven.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
