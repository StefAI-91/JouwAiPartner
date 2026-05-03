import Link from "next/link";
import { MessageCircle, Plus } from "lucide-react";

/**
 * PR-026 — Empty-state voor de detail-pane op `md+` zonder selectie.
 *
 * Twee gevallen:
 *   - lijst is gevuld, maar gebruiker heeft geen item geselecteerd → "kies
 *     een bericht of start een nieuw gesprek".
 *   - lijst is leeg → "Start je eerste gesprek".
 *
 * Pure visuele state-pane; geen data-fetching. Wordt op mobile (`<md`) niet
 * gerenderd want daar verbergt de layout-shell het hele detail-pane.
 */
export function PortalEmptyPane({
  projectId,
  hasQuestions,
}: {
  projectId: string;
  hasQuestions: boolean;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-12 text-center">
      <div>
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-muted">
          <MessageCircle className="size-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium text-foreground">
          {hasQuestions ? "Selecteer een bericht" : "Nog geen berichten"}
        </p>
        <p className="mx-auto mt-1 max-w-[36ch] text-xs text-muted-foreground">
          {hasQuestions
            ? "Kies links een bericht om de thread te openen, of start een nieuw gesprek."
            : "Stuur je eerste bericht aan het team en houd alle contact op één plek bij."}
        </p>
        <Link
          href={`/projects/${projectId}/inbox/new`}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          Nieuw bericht aan team
        </Link>
      </div>
    </div>
  );
}
