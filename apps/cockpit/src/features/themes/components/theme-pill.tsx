import Link from "next/link";

export interface ThemePillData {
  slug: string;
  name: string;
  emoji: string;
  mentions30d: number;
}

/**
 * Klikbare pill voor één thema. Hover-lift + border-accent, geen tooltip.
 *
 * Emoji + naam + mention-count-badge. Default link-target `/themes/[slug]` —
 * de echte detail-page komt in TH-005; in TH-004 resolvt dit naar een
 * placeholder-route.
 */
export function ThemePill({ theme }: { theme: ThemePillData }) {
  return (
    <Link
      href={`/themes/${theme.slug}`}
      className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-[13px] font-medium text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow"
    >
      <span aria-hidden="true">{theme.emoji}</span>
      <span>{theme.name}</span>
      <span className="rounded-full bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        {theme.mentions30d}
      </span>
    </Link>
  );
}
