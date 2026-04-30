import Link from "next/link";
import { PORTAL_STATUS_GROUPS, type PortalStatusKey } from "@repo/database/constants/issues";
import type { PortalIssueCounts } from "@repo/database/queries/portal";

interface StatusFooterProps {
  counts: PortalIssueCounts;
  projectId: string;
}

/**
 * CP-010 — Subtiele footer met de issue-counts. Vervangt het luidruchtige
 * `IssueMetrics`-grid uit v1 — counts horen niet de hoofdcontent te zijn,
 * de actie-blokken erboven wel.
 */
export function StatusFooter({ counts, projectId }: StatusFooterProps) {
  return (
    <section className="border-t border-border pt-6">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Stand van zaken
      </p>
      <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm">
        {PORTAL_STATUS_GROUPS.map((group, idx) => {
          const key = group.key as PortalStatusKey;
          return (
            <div key={key} className="flex items-baseline gap-2">
              {idx > 0 ? <span className="mr-6 text-border">·</span> : null}
              <dt className="text-muted-foreground">{group.label}</dt>
              <dd className="font-semibold">{counts[key]}</dd>
            </div>
          );
        })}
        <Link
          href={`/projects/${projectId}/roadmap`}
          className="ml-auto text-xs font-medium text-primary hover:text-primary/80"
        >
          Naar de roadmap →
        </Link>
      </dl>
    </section>
  );
}
