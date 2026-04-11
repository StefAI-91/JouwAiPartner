"use client";

export default function PersonDetailError({ reset }: { reset: () => void }) {
  return (
    <div className="px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Er ging iets mis</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Kon deze persoon niet laden. Probeer het opnieuw.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
