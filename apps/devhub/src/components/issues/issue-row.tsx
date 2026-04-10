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
import { Avatar } from "@/components/shared/avatar";
import { timeAgo } from "@/components/shared/time-ago";
import { cn } from "@repo/ui/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@repo/ui/dropdown-menu";
import { deleteIssueAction, updateIssueAction } from "@/actions/issues";
import { startAiExecution } from "@/actions/execute";

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
        "group relative border-b border-border px-4 py-3.5 transition-colors hover:bg-muted/50",
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

      <div className="flex gap-3">
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
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-8 sm:gap-2">
            <TypeBadge type={issue.type} />
            <StatusBadge status={issue.status} />
            <ComponentBadge component={issue.component} />
            {issue.assigned_person ? (
              <Avatar name={issue.assigned_person.full_name} />
            ) : (
              <span className="size-7" />
            )}
            <span className="ml-auto text-xs sm:text-sm text-muted-foreground">
              {timeAgo(issue.created_at)}
            </span>
          </div>
        </Link>

        {/* Desktop: thumbnail + actions inline */}
        <div className="hidden sm:flex items-center gap-2">
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

      {/* Mobile: thumbnail + actions below content */}
      <div className="mt-2 flex items-center gap-2 pl-8 sm:hidden">
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

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
    </div>
  );
}
