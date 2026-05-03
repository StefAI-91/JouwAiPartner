import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { cn } from "@repo/ui/utils";
import type { IssueRow } from "@repo/database/queries/issues";
import { Avatar } from "@/components/shared/avatar";
import { PriorityBadge } from "@/components/shared/priority-badge";

interface ThisWeekGroupProps {
  /** Display-naam van de assignee, of null voor de "Niemand"-groep. */
  name: string | null;
  issues: IssueRow[];
  /** Toont een Claim-link naast elke rij (alleen zinvol bij unassigned). */
  showClaim?: boolean;
}

export function ThisWeekGroup({ name, issues, showClaim }: ThisWeekGroupProps) {
  const isUnassigned = name === null;

  return (
    <div className={cn("border-b border-border last:border-0", isUnassigned && "bg-amber-50/30")}>
      <div className="flex items-center gap-2 px-3 py-2">
        {isUnassigned ? (
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-amber-400 text-amber-600">
            <HelpCircle className="size-3.5" />
          </span>
        ) : (
          <Avatar name={name} />
        )}
        <span
          className={cn(
            "text-sm font-semibold",
            isUnassigned ? "text-amber-700" : "text-foreground",
          )}
        >
          {name ?? "Niemand"}
        </span>
        <span className="text-xs text-muted-foreground">({issues.length})</span>
      </div>
      <ul className="pb-2">
        {issues.map((issue) => (
          <li key={issue.id}>
            <Link
              href={`/issues/${issue.id}?project=${issue.project_id}`}
              className="flex items-center gap-3 py-1.5 pl-10 pr-3 hover:bg-muted/40"
            >
              <PriorityBadge priority={issue.priority} variant="compact" />
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                #{issue.issue_number}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
              {showClaim && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                  Claim
                  <ArrowRight className="size-3" />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
