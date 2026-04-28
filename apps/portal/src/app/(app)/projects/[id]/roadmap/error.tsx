"use client";

import { useEffect } from "react";

export default function RoadmapError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[roadmap] page error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-[var(--ink)]">
          Roadmap kon niet worden geladen
        </h2>
        <p className="text-sm text-[var(--ink-muted)]">
          Probeer de pagina opnieuw te laden. Blijft het hangen, neem contact op.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-[var(--paper-deep)]"
        style={{ borderColor: "var(--rule-hairline)" }}
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
