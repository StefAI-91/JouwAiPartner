"use client";

export default function ReviewError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Could not load the review queue. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-[#006B3F] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}
