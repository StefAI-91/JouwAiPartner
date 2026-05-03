import { cn } from "./utils";

/**
 * `SourceIndicator` — gedeelde bron-indicator voor klant-PM vs eindgebruiker.
 *
 * Twee varianten:
 *   - `"dot"`: subtiele bullet voor compacte rijen (cockpit-inbox).
 *   - `"badge"`: gevulde badge met label voor lijst-views (devhub-issues).
 *
 * Resolutie van `source` → `group` doet de caller — `@repo/ui` blijft puur
 * presentatie en heeft geen database-dependency. Helpers die je kunt gebruiken:
 *   `resolveDevhubSourceGroup(source)` (returns key | null)
 *   `resolvePortalSourceGroup(source)` (returns key | "jaip")
 *
 * Onbekende of `null` group → render niets (consistent met de oude
 * source-badge/source-dot fallback).
 */

export type SourceGroup = "client_pm" | "end_user";

export interface SourceIndicatorProps {
  group: SourceGroup | null | undefined;
  variant?: "dot" | "badge";
  /** `dot` heeft alleen `xl:`-label visible; `compact` verbergt hem altijd. */
  compact?: boolean;
  className?: string;
}

const LABEL: Record<SourceGroup, { full: string; short: string }> = {
  client_pm: { full: "Klant-PM", short: "Klant-PM" },
  end_user: { full: "Eindgebruiker", short: "Eindgebr." },
};

const BADGE_CLASSNAME: Record<SourceGroup, string> = {
  client_pm: "bg-violet-50 text-violet-700 border-violet-200",
  end_user: "bg-orange-50 text-orange-700 border-orange-200",
};

const DOT_CLASSNAME: Record<SourceGroup, string> = {
  client_pm: "bg-[oklch(0.55_0.12_280)]",
  end_user: "bg-warning/80",
};

export function SourceIndicator({
  group,
  variant = "badge",
  compact = false,
  className,
}: SourceIndicatorProps) {
  if (!group) return null;
  const labels = LABEL[group];

  if (variant === "dot") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground/70",
          className,
        )}
        title={labels.full}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSNAME[group])} aria-hidden />
        {!compact ? <span className="hidden xl:inline">{labels.short}</span> : null}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.7rem] font-medium leading-none",
        BADGE_CLASSNAME[group],
        className,
      )}
    >
      {labels.full}
    </span>
  );
}
