"use client";

export default function WeeklyError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <h2 className="text-lg font-semibold text-destructive">Er ging iets mis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Het weekoverzicht kon niet worden geladen.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 transition-opacity"
        >
          Opnieuw proberen
        </button>
      </div>
    </div>
  );
}
