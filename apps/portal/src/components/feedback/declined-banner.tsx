/**
 * Toont een eenregelige uitleg onder de status-badge wanneer een feedback-
 * item door de PM is afgewezen. Bewust subtle (geen full alert-banner) —
 * de klant heeft de info nodig zonder dat het scherm gedomineerd wordt.
 */
export function DeclinedBanner({ reason }: { reason: string | null | undefined }) {
  if (!reason) return null;
  return (
    <p className="mt-1 text-xs italic text-muted-foreground">
      <span className="font-medium not-italic text-foreground/70">Afgewezen — </span>
      {reason}
    </p>
  );
}
