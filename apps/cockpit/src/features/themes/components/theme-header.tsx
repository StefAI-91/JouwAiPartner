import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { timeAgoDays } from "@repo/ui/format";
import type { ThemeRow } from "@repo/database/queries/themes";

export interface ThemeHeaderProps {
  theme: ThemeRow;
  /** 30d mentions uit `getThemeRecentActivity`. */
  mentions30d: number;
  /** Laatste match-tijd (van alle tijd) voor "X dagen geleden". */
  lastMentionedAt: string | null;
  /** Of de edit-icon gerenderd moet worden (alleen voor admin users). */
  canEdit: boolean;
  /** Handler om naar edit-mode te switchen — client-side state in de parent. */
  onEditClick?: () => void;
}

/**
 * UI-267/268/269 — header voor de theme detail page. Emoji 32px, h1 naam,
 * muted description. Rechts een badge met 30d mentions + laatste mention-
 * datum, en een edit-icoon voor admins. Edit-icoon is een CLIENT handler,
 * dus deze header wordt vanuit een client wrapper gerenderd (ThemeDetailView).
 */
export function ThemeHeader({
  theme,
  mentions30d,
  lastMentionedAt,
  canEdit,
  onEditClick,
}: ThemeHeaderProps) {
  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Terug naar dashboard
      </Link>
      <header className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <span className="text-[32px] leading-none" aria-hidden="true">
            {theme.emoji}
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">{theme.name}</h1>
            <p className="max-w-xl text-[14px] text-muted-foreground">{theme.description}</p>
            {theme.status !== "verified" && (
              <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                Status: {theme.status}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-2 text-right">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              laatste 30d
            </div>
            <div className="text-lg font-semibold text-foreground">{mentions30d}</div>
            <div className="text-[11px] text-muted-foreground">
              {lastMentionedAt ? `laatst ${timeAgoDays(lastMentionedAt)}` : "nog geen mentions"}
            </div>
          </div>
          {canEdit && onEditClick && (
            <button
              type="button"
              onClick={onEditClick}
              aria-label="Bewerk thema"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>
    </div>
  );
}
