"use client";

export default function InboxError({ reset }: { reset: () => void }) {
  return (
    <div className="px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Inbox kon niet laden</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Probeer het opnieuw — als het blijft falen, check de console voor de foutmelding.
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
