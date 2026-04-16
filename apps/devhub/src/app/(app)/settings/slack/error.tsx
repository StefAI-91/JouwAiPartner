"use client";

export default function Error() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-lg font-semibold">Slack notificaties</h1>
      <p className="mt-4 text-sm text-destructive">
        Er ging iets mis bij het laden van de Slack instellingen. Probeer de pagina te vernieuwen.
      </p>
    </div>
  );
}
