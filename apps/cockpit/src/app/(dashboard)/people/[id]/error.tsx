"use client";

export default function PersonDetailError({ reset }: { reset: () => void }) {
  return (
    <div className="px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Could not load this person. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}
