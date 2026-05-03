"use client";

import { useEffect } from "react";
import { Button } from "@repo/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Journey page error:", error);
  }, [error]);

  return (
    <div className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div>
        <h2 className="text-lg font-semibold">Er ging iets mis bij het laden van de klantreis</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error.message || "Onbekende fout."}</p>
      </div>
      <Button variant="outline" onClick={reset}>
        Probeer opnieuw
      </Button>
    </div>
  );
}
