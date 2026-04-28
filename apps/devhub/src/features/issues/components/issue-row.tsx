"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2 } from "lucide-react";
import type { IssueRow } from "@repo/database/queries/issues";
import type { IssueTopicMembership } from "@repo/database/queries/topics";
import { PriorityDot } from "@/components/shared/priority-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { TypeBadge } from "@/components/shared/type-badge";
import { ComponentBadge } from "@/components/shared/component-badge";
import { Avatar } from "@/components/shared/avatar";
import { timeAgo } from "@/components/shared/time-ago";
import { TopicPill } from "@/features/topics/components/topic-pill";
import { cn } from "@repo/ui/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@repo/ui/dropdown-menu";
import { deleteIssueAction } from "../actions/issues";
import { issueCountStore } from "@/components/layout/issue-count-store";

function IssueThumbnail({ storagePath }: { storagePath: string }) {
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/issue-attachments/${storagePath}`;
  return (
    <div className="shrink-0 overflow-hidden rounded-md border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={publicUrl} alt="Screenshot" className="size-16 object-cover" loading="lazy" />
    </div>
  );
}

function IssueRowActions({
  thumbnailPath,
  onDelete,
  triggerClassName,
}: {
  thumbnailPath?: string;
  onDelete: () => void;
  triggerClassName?: string;
}) {
  return (
    <>
      {thumbnailPath && <IssueThumbnail storagePath={thumbnailPath} />}

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
            triggerClassName,
          )}
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
            Verwijder issue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function IssueRowItem({
  issue,
  thumbnailPath,
  topic,
  topics,
  compact,
  className,
}: {
  issue: IssueRow;
  thumbnailPath?: string;
  topic?: IssueTopicMembership;
  topics: { id: string; title: string; type?: string }[];
  /**
   * Compact-mode: minder padding, geen description-regel. Gebruikt in
   * "Niet gegroepeerd" sectie zodat de gecureerde topic-secties meer
   * visueel gewicht krijgen.
   */
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [optimisticallyDeleted, setOptimisticallyDeleted] = useState(false);

  function handleDelete() {
    // Hide the row instantly — the server action plus revalidate takes long
    // enough that the confirm overlay lingering feels sluggish. If the
    // delete fails we restore the row and surface the error.
    setOptimisticallyDeleted(true);
    setShowConfirm(false);
    // Reflect the decrement in the sidebar counts immediately.
    issueCountStore.bump(issue.project_id, issue.status, null);

    startTransition(async () => {
      const result = await deleteIssueAction({ id: issue.id });
      if ("error" in result) {
        console.error(result.error);
        setOptimisticallyDeleted(false);
        issueCountStore.bump(issue.project_id, null, issue.status);
      } else {
        router.refresh();
        issueCountStore.refresh(issue.project_id);
      }
    });
  }

  if (optimisticallyDeleted) return null;

  return (
    <div
      className={cn(
        "group relative border-b border-border px-4 transition-colors hover:bg-muted/50",
        compact ? "py-2" : "py-3.5",
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
          <div className="flex items-start gap-2">
            <PriorityDot priority={issue.priority} />
            <span className="shrink-0 text-sm text-muted-foreground font-mono mt-0.5">
              #{issue.issue_number}
            </span>
            <span className="min-w-0 flex-1 font-medium text-foreground group-hover:text-primary line-clamp-2">
              {issue.title}
            </span>
          </div>

          {!compact && issue.description && issue.description !== issue.title && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2 pl-8">
              {issue.description}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-8 sm:gap-2">
            <TypeBadge type={issue.type} />
            <StatusBadge status={issue.status} />
            <ComponentBadge component={issue.component} />
            <TopicPill
              issueId={issue.id}
              projectId={issue.project_id}
              current={topic ? { id: topic.id, title: topic.title } : null}
              topics={topics}
            />
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

        {/* Desktop: actions inline */}
        <div className="hidden sm:flex items-center gap-2">
          <IssueRowActions
            thumbnailPath={thumbnailPath}
            onDelete={() => setShowConfirm(true)}
            triggerClassName="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          />
        </div>
      </div>

      {/* Mobile: actions below content */}
      <div className="mt-2 flex items-center gap-2 pl-8 sm:hidden">
        <IssueRowActions thumbnailPath={thumbnailPath} onDelete={() => setShowConfirm(true)} />
      </div>
    </div>
  );
}
