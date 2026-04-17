"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="nl">
      <body className="flex h-screen items-center justify-center bg-neutral-50 font-sans">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold">Er ging iets mis</h2>
          <p className="mt-2 text-sm text-neutral-500">
            {error.message || "Er is een onverwachte fout opgetreden."}
          </p>
          <button
            onClick={reset}
            className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Opnieuw proberen
          </button>
        </div>
      </body>
    </html>
  );
}
