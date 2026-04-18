import Link from "next/link";
import { cn } from "@repo/ui/utils";
import { formatDate } from "@repo/ui/format";
import type { PortalIssue } from "@repo/database/queries/portal";
import {
  STATUS_COLORS,
  STATUS_MAP,
  translateStatus,
  type PortalStatusGroup,
} from "@/lib/issue-status";
import { IssueTypeBadge } from "./issue-type-badge";

interface IssueListProps {
  projectId: string;
  issues: PortalIssue[];
}

export function IssueList({ projectId, issues }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">Nog geen meldingen voor dit project.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {issues.map((issue) => {
        const label = translateStatus(issue.status);
        const group = STATUS_MAP[issue.status] as PortalStatusGroup | undefined;
        const colorClass = group ? STATUS_COLORS[group] : "bg-muted text-muted-foreground";

        return (
          <li key={issue.id}>
            <Link
              href={`/projects/${projectId}/issues/${issue.id}`}
              className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
            >
              <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                #{issue.issue_number}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {issue.title}
              </span>
              <IssueTypeBadge type={issue.type} className="shrink-0" />
              <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs", colorClass)}>
                {label}
              </span>
              <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                {formatDate(issue.created_at)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
