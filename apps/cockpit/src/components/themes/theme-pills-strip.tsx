import { ChevronRight } from "lucide-react";
import { listTopActiveThemes, type TopActiveTheme } from "@repo/database/queries/themes";
import { ThemePill } from "./theme-pill";

/**
 * Server component — A1 uit PRD §8: horizontale strip met top-N meest
 * actieve thema's (default 8) over de laatste 30 dagen.
 *
 * Empty-state: neutrale melding die duidelijk maakt dat het gevuld raakt na
 * de eerste batch-run (TH-003). Geen scary error, geen spinner — je ziet
 * dat er nog geen data is en waarom.
 */
export async function ThemePillsStrip({
  limit = 8,
  windowDays = 30,
}: {
  limit?: number;
  windowDays?: number;
} = {}) {
  const themes: TopActiveTheme[] = await listTopActiveThemes({ limit, windowDays });

  if (themes.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-medium text-muted-foreground">
            Actieve thema&apos;s · laatste {windowDays} dagen
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Nog geen thema&apos;s — loopt na eerste batch-run vanzelf vol.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-medium text-muted-foreground">
          Actieve thema&apos;s · laatste {windowDays} dagen
        </div>
        {/* Target is v2-index — in v1 verwijzen we naar de eerste pill als
            placeholder-anker zodat de link niet dood is. */}
        <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70">
          Top {themes.length} van actieve thema&apos;s
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {themes.map((t) => (
          <ThemePill
            key={t.id}
            theme={{ slug: t.slug, name: t.name, emoji: t.emoji, mentions30d: t.mentions30d }}
          />
        ))}
      </div>
    </div>
  );
}
