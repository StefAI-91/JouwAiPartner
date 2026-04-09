import Link from "next/link";
import type { IssueRow } from "@repo/database/queries/issues";
import { PriorityDot } from "@/components/shared/priority-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { TypeBadge } from "@/components/shared/type-badge";
import { ComponentBadge } from "@/components/shared/component-badge";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

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
        "group flex items-center gap-3 border-b border-border px-4 py-2 text-sm transition-colors hover:bg-muted/50",
        className,
      )}
    >
      <PriorityDot priority={issue.priority} />

      <span className="shrink-0 w-10 text-xs text-muted-foreground font-mono">
        #{issue.issue_number}
      </span>

      <div className="min-w-0 flex-1">
        <span className="truncate font-medium text-foreground group-hover:text-primary block">
          {issue.title}
        </span>
        {issue.description && (
          <span className="block truncate text-xs text-muted-foreground mt-0.5">
            {issue.description.slice(0, 120)}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <TypeBadge type={issue.type} />
        <ComponentBadge component={issue.component} />
        <AssignedAvatar person={issue.assigned_person} />
        <StatusBadge status={issue.status} />
        <span className="w-16 text-right text-xs text-muted-foreground">
          {timeAgo(issue.created_at)}
        </span>
      </div>
    </Link>
  );
}
