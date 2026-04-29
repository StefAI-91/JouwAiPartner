import {
  INTERNAL_STATUS_TO_PORTAL_KEY,
  PORTAL_STATUS_GROUPS,
  type PortalStatusKey,
} from "@repo/database/constants/issues";
import type { PortalIssue, PortalIssueCounts } from "@repo/database/queries/portal";
import { IssueCard } from "./issue-card";

interface BucketDashboardProps {
  projectId: string;
  issues: PortalIssue[];
  counts: PortalIssueCounts;
}

/**
 * Vier-koloms dashboard dat de geleverde issues groepeert per
 * portal-statusgroep. Volgt de canonieke volgorde uit `PORTAL_STATUS_GROUPS`
 * (Ontvangen → Ingepland → In behandeling → Afgerond) — wijzigen daar
 * propageert hier automatisch zonder duplicate-mapping.
 *
 * `counts` toont het totaal per bucket onafhankelijk van de huidige page-load
 * — dus als een bucket meer issues bevat dan de page-size, blijft de teller
 * eerlijk.
 */
export function BucketDashboard({ projectId, issues, counts }: BucketDashboardProps) {
  const grouped: Record<PortalStatusKey, PortalIssue[]> = {
    ontvangen: [],
    ingepland: [],
    in_behandeling: [],
    afgerond: [],
  };

  for (const issue of issues) {
    const key =
      INTERNAL_STATUS_TO_PORTAL_KEY[issue.status as keyof typeof INTERNAL_STATUS_TO_PORTAL_KEY];
    if (key) grouped[key].push(issue);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PORTAL_STATUS_GROUPS.map((group) => {
        const bucket = grouped[group.key];
        const total = counts[group.key] ?? 0;
        return (
          <section
            key={group.key}
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 shadow-soft-sm"
            aria-labelledby={`bucket-${group.key}-heading`}
          >
            <header className="flex items-center justify-between gap-2 px-1">
              <h3
                id={`bucket-${group.key}-heading`}
                className="text-sm font-semibold text-foreground"
              >
                {group.label}
              </h3>
              <span
                className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground"
                aria-label={`${total} ${total === 1 ? "issue" : "issues"}`}
              >
                {total}
              </span>
            </header>
            {bucket.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-background/50 py-6 text-center text-xs text-muted-foreground">
                Geen items
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {bucket.map((issue) => (
                  <li key={issue.id}>
                    <IssueCard projectId={projectId} issue={issue} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
