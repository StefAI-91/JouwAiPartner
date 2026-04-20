"use client";

import { useEffect } from "react";
import { Button } from "@repo/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AgentsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Er is iets misgegaan</h2>
        <p className="text-sm text-muted-foreground">
          De agents-pagina kon niet worden geladen. Probeer het opnieuw.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        Opnieuw proberen
      </Button>
    </div>
  );
}
