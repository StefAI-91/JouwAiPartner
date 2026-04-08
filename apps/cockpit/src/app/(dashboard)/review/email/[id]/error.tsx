"use client";

export default function EmailReviewError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="px-4 py-16 text-center lg:px-10">
      <h2 className="font-heading text-xl font-semibold">Er ging iets mis</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Probeer opnieuw
      </button>
    </div>
  );
}
