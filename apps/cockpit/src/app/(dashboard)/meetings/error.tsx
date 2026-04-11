"use client";

import { Button } from "@repo/ui/button";

export default function MeetingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Er ging iets mis</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Kon meetings niet laden. Probeer het later opnieuw.
      </p>
      <Button variant="outline" onClick={reset} className="mt-4">
        Probeer opnieuw
      </Button>
    </div>
  );
}
