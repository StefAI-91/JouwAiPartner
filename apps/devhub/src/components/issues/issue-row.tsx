import Link from "next/link";
import type { IssueRow } from "@repo/database/queries/issues";
import { PriorityDot } from "@/components/shared/priority-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { TypeBadge } from "@/components/shared/type-badge";
import { ComponentBadge } from "@/components/shared/component-badge";
import { cn } from "@repo/ui/utils";
import { timeAgo } from "@/lib/time-ago";

function AssignedAvatar({ person }: { person: { full_name: string } | null }) {
  if (!person) return <span className="size-6" />;
  const initials = (person.full_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[0.6rem] font-medium text-muted-foreground"
      title={person.full_name}
    >
      {initials}
    </span>
  );
}

export function IssueRowItem({ issue, className }: { issue: IssueRow; className?: string }) {
  return (
    <Link
      href={`/issues/${issue.id}`}
      className={cn(
        "group block border-b border-border px-4 py-3 text-sm transition-colors hover:bg-muted/50",
        className,
      )}
    >
      {/* Row 1: number + title (full width) */}
      <div className="flex items-start gap-2">
        <PriorityDot priority={issue.priority} />
        <span className="shrink-0 text-xs text-muted-foreground font-mono mt-0.5">
          #{issue.issue_number}
        </span>
        <span className="min-w-0 flex-1 font-medium text-foreground group-hover:text-primary line-clamp-2">
          {issue.title}
        </span>
      </div>

      {/* Row 2: description (full width, 2 lines) */}
      {issue.description && issue.description !== issue.title && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 pl-8">{issue.description}</p>
      )}

      {/* Row 3: badges + meta */}
      <div className="mt-1.5 flex items-center gap-2 pl-8">
        <TypeBadge type={issue.type} />
        <StatusBadge status={issue.status} />
        <ComponentBadge component={issue.component} />
        <AssignedAvatar person={issue.assigned_person} />
        <span className="ml-auto text-xs text-muted-foreground">{timeAgo(issue.created_at)}</span>
      </div>
    </Link>
  );
}
