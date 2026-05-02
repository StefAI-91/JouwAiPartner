"use client";

export default function ConversationError({ reset }: { reset: () => void }) {
  return (
    <div className="px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Conversation kon niet laden</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Probeer het opnieuw — of ga terug naar de inbox.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          onClick={reset}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          Opnieuw proberen
        </button>
      </div>
    </div>
  );
}
