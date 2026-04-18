import { cn } from "@repo/ui/utils";
import { PORTAL_STATUS_GROUPS, type PortalStatusKey } from "@repo/database/constants/issues";
import type { PortalIssueCounts } from "@repo/database/queries/portal";
import { STATUS_COLORS } from "@/lib/issue-status";

interface IssueMetricsProps {
  counts: PortalIssueCounts;
}

export function IssueMetrics({ counts }: IssueMetricsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {PORTAL_STATUS_GROUPS.map((group) => {
        const key = group.key as PortalStatusKey;
        return (
          <div
            key={key}
            className={cn("flex flex-col gap-1 rounded-lg border p-4", STATUS_COLORS[key])}
          >
            <span className="text-xs font-medium uppercase tracking-wide opacity-80">
              {group.label}
            </span>
            <span className="text-2xl font-semibold">{counts[key]}</span>
          </div>
        );
      })}
    </div>
  );
}
