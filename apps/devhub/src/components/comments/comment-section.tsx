"use client";

import { useOptimistic } from "react";
import type { IssueCommentRow } from "@repo/database/queries/issue-comments";
import type { IssueActivityRow } from "@repo/database/queries/issue-activity";
import { CommentActivityFeed } from "./comment-list";
import { CommentForm } from "./comment-form";

export interface CurrentUser {
  id: string;
  name: string;
}

interface CommentSectionProps {
  issueId: string;
  comments: IssueCommentRow[];
  activities: IssueActivityRow[];
  currentUser?: CurrentUser | null;
}

/**
 * Wraps the feed + form so a newly submitted comment appears in the list
 * instantly (optimistic), rather than after the server action + revalidate
 * roundtrip. On failure the form re-shows the text so the user can retry.
 */
export function CommentSection({
  issueId,
  comments,
  activities,
  currentUser,
}: CommentSectionProps) {
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (current: IssueCommentRow[], pending: IssueCommentRow) => [...current, pending],
  );

  function handleOptimisticAdd(body: string) {
    const now = new Date().toISOString();
    addOptimisticComment({
      id: `optimistic-${now}`,
      issue_id: issueId,
      author_id: currentUser?.id ?? "",
      author: currentUser ? { id: currentUser.id, full_name: currentUser.name } : null,
      body,
      created_at: now,
      updated_at: now,
    });
  }

  return (
    <section>
      <h2 className="mb-3">Reacties &amp; activiteit</h2>
      <CommentActivityFeed comments={optimisticComments} activities={activities} />
      <div className="mt-4">
        <CommentForm issueId={issueId} onOptimisticAdd={handleOptimisticAdd} />
      </div>
    </section>
  );
}
