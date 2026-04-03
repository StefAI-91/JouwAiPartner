"use client";

import { Button } from "@/components/ui/button";

export default function MeetingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Could not load meetings. Please try again later.
      </p>
      <Button variant="outline" onClick={reset} className="mt-4">
        Probeer opnieuw
      </Button>
    </div>
  );
}
