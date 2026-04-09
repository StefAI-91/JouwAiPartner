"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, Bot } from "lucide-react";
import type { IssueRow } from "@repo/database/queries/issues";
import { PriorityDot } from "@/components/shared/priority-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { TypeBadge } from "@/components/shared/type-badge";
import { ComponentBadge } from "@/components/shared/component-badge";
import { cn } from "@repo/ui/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@repo/ui/dropdown-menu";
import { deleteIssueAction, updateIssueAction } from "@/actions/issues";
import { startAiExecution } from "@/actions/execute";

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
  if (!person) return <span className="size-7" />;
  const initials = (person.full_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-[0.7rem] font-medium text-muted-foreground"
      title={person.full_name}
    >
      {initials}
    </span>
  );
}

function IssueThumbnail({ storagePath }: { storagePath: string }) {
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/issue-attachments/${storagePath}`;
  return (
    <div className="shrink-0 overflow-hidden rounded-md border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={publicUrl} alt="Screenshot" className="size-16 object-cover" loading="lazy" />
    </div>
  );
}

export function IssueRowItem({
  issue,
  thumbnailPath,
  className,
}: {
  issue: IssueRow;
  thumbnailPath?: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteIssueAction({ id: issue.id });
      if ("error" in result) {
        console.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleAiPickup() {
    startTransition(async () => {
      const result = await updateIssueAction({ id: issue.id, status: "in_progress" });
      if ("error" in result) {
        console.error(result.error);
      } else {
        window.dispatchEvent(new Event("issues-changed"));
        startAiExecution({ issueId: issue.id });
        router.push(`/issues/${issue.id}?project=${issue.project_id}`);
      }
    });
  }

  const canAiPickup =
    issue.status !== "in_progress" &&
    issue.status !== "done" &&
    issue.status !== "cancelled" &&
    issue.execution_type !== "ai";

  return (
    <div
      className={cn(
        "group relative flex gap-3 border-b border-border px-4 py-3.5 transition-colors hover:bg-muted/50",
        isPending && "opacity-50 pointer-events-none",
        className,
      )}
    >
      {/* Delete confirmation overlay */}
      {showConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-background/95 px-4">
          <p className="text-sm text-destructive">Verwijderen?</p>
          <button
            onClick={handleDelete}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Ja, verwijder
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Annuleren
          </button>
        </div>
      )}

      {/* Main link area */}
      <Link href={`/issues/${issue.id}?project=${issue.project_id}`} className="min-w-0 flex-1">
        {/* Row 1: number + title */}
        <div className="flex items-start gap-2">
          <PriorityDot priority={issue.priority} />
          <span className="shrink-0 text-sm text-muted-foreground font-mono mt-0.5">
            #{issue.issue_number}
          </span>
          <span className="min-w-0 flex-1 font-medium text-foreground group-hover:text-primary line-clamp-2">
            {issue.title}
          </span>
        </div>

        {/* Row 2: description */}
        {issue.description && issue.description !== issue.title && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2 pl-8">
            {issue.description}
          </p>
        )}

        {/* Row 3: badges + meta */}
        <div className="mt-1.5 flex items-center gap-2 pl-8">
          <TypeBadge type={issue.type} />
          <StatusBadge status={issue.status} />
          <ComponentBadge component={issue.component} />
          <AssignedAvatar person={issue.assigned_person} />
          <span className="ml-auto text-sm text-muted-foreground">{timeAgo(issue.created_at)}</span>
        </div>
      </Link>

      {/* Right side: thumbnail + actions */}
      <div className="flex items-center gap-2">
        {thumbnailPath && <IssueThumbnail storagePath={thumbnailPath} />}

        {canAiPickup && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAiPickup();
            }}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
            title="Laat AI dit issue oppakken"
          >
            <Bot className="size-5" />
            AI oppakken
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
            onClick={(e) => e.preventDefault()}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="size-4" />
              Verwijder issue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
