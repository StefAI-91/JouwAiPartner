import Link from "next/link";
import { cn } from "@repo/ui/utils";
import { timeAgoDays } from "@repo/ui/format";
import {
  STATUS_COLORS,
  STATUS_MAP,
  translateStatus,
  type PortalStatusGroup,
} from "@/lib/issue-status";
import type { RecentPortalIssue } from "@repo/database/queries/portal";

interface RecentActivityProps {
  projectId: string;
  issues: RecentPortalIssue[];
}

export function RecentActivity({ projectId, issues }: RecentActivityProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Recente activiteit</h2>
        <Link
          href={`/projects/${projectId}/issues`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Alle issues
        </Link>
      </div>

      {issues.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Er zijn nog geen issues aangemaakt voor dit project.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {issues.map((issue) => {
            const label = translateStatus(issue.status);
            const group = STATUS_MAP[issue.status] as PortalStatusGroup | undefined;
            const colorClass = group ? STATUS_COLORS[group] : "bg-muted text-muted-foreground";

            return (
              <li key={issue.id} className="flex items-center gap-3 py-3">
                <span className="shrink-0 text-xs font-mono text-muted-foreground">
                  #{issue.issue_number}
                </span>
                <span className="flex-1 truncate text-sm text-foreground">{issue.title}</span>
                <span
                  className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs", colorClass)}
                >
                  {label}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgoDays(issue.updated_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
