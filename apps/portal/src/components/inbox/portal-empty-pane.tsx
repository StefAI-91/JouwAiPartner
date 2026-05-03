import Link from "next/link";
import { MessageCircle, Plus } from "lucide-react";
import { OnboardingCard } from "./onboarding-card";

/**
 * PR-026 — Empty-state voor de detail-pane op `md+` zonder selectie.
 *
 * Drie subvarianten:
 *   - `showOnboarding=true`            → rijke welkom-card met de drie bullets
 *     en een "+ Nieuw bericht"-CTA. Eerste-bezoek krijgt zo een duidelijke
 *     intro zonder dat de smalle lijst-pane dichtgeplempt wordt.
 *   - `hasQuestions=true` (gedismissed) → "Selecteer een bericht" prompt.
 *   - lege lijst (gedismissed)         → "Nog geen berichten" + CTA.
 *
 * Wordt op mobile (`<md`) niet gerenderd; daar verbergt de layout-shell
 * het hele detail-pane wanneer er geen selectie is. Mobile-gebruikers
 * vallen terug op de lijst zelf, die compact genoeg is om als
 * onboarding-surface te dienen.
 */
export function PortalEmptyPane({
  projectId,
  hasQuestions,
  showOnboarding,
}: {
  projectId: string;
  hasQuestions: boolean;
  showOnboarding: boolean;
}) {
  if (showOnboarding) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <OnboardingCard />
          <div className="mt-2 flex justify-center">
            <Link
              href={`/projects/${projectId}/inbox/new`}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Plus className="size-3.5" />
              Start een nieuw gesprek
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
