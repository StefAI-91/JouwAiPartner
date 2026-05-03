"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@repo/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function InboxError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[portal/inbox]", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Berichten konden niet worden geladen</h2>
        <p className="text-sm text-muted-foreground">Probeer het nog eens.</p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        Opnieuw proberen
      </Button>
    </div>
  );
}
