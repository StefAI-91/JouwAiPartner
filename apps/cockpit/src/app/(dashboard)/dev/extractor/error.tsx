"use client";

export default function DevExtractorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Er ging iets mis</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Kon de extractor-harness niet laden. Probeer het opnieuw, of check de logs.
      </p>
      {error?.digest && (
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">digest: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-[#006B3F] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
