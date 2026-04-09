"use client";

import { Button } from "@repo/ui/button";

export default function ReviewError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <p className="text-sm text-muted-foreground">Er ging iets mis bij het laden van de review.</p>
      <Button variant="outline" onClick={reset}>
        Opnieuw proberen
      </Button>
    </div>
  );
}
