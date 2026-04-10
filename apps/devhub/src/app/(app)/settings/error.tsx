"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@repo/ui/button";

export default function SettingsError({
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Instellingen laden mislukt</h2>
        <p className="text-sm text-muted-foreground">
          Er ging iets mis bij het laden van de instellingen.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        Opnieuw proberen
      </Button>
    </div>
  );
}
