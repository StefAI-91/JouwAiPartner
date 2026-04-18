import { cn } from "@repo/ui/utils";
import { STATUS_COLORS, type PortalStatusGroup } from "@/lib/issue-status";
import type { PortalIssueCounts } from "@repo/database/queries/portal";

interface IssueMetricsProps {
  counts: PortalIssueCounts;
}

const METRICS: { key: keyof PortalIssueCounts; label: PortalStatusGroup }[] = [
  { key: "ontvangen", label: "Ontvangen" },
  { key: "ingepland", label: "Ingepland" },
  { key: "in_behandeling", label: "In behandeling" },
  { key: "afgerond", label: "Afgerond" },
];

export function IssueMetrics({ counts }: IssueMetricsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {METRICS.map((metric) => (
        <div
          key={metric.key}
          className={cn("flex flex-col gap-1 rounded-lg border p-4", STATUS_COLORS[metric.label])}
        >
          <span className="text-xs font-medium uppercase tracking-wide opacity-80">
            {metric.label}
          </span>
          <span className="text-2xl font-semibold">{counts[metric.key]}</span>
        </div>
      ))}
    </div>
  );
}
