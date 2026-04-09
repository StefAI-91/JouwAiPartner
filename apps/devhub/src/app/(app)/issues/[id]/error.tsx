"use client";

export default function IssueDetailError({ reset }: { reset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <p className="text-sm text-destructive">Er ging iets mis bij het laden van dit issue.</p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
