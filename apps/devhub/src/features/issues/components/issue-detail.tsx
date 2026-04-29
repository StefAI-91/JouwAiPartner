"use client";

import { useOptimistic, useTransition } from "react";
import type { IssueRow } from "@repo/database/queries/issues";
import type { IssueCommentRow } from "@repo/database/queries/issues/comments";
import type { IssueActivityRow } from "@repo/database/queries/issues/activity";
import type { IssueAttachmentRow } from "@repo/database/queries/issues/attachments";
import { updateIssueAction } from "../actions/issues";
import { issueCountStore } from "@/components/layout/issue-count-store";

import { IssueHeader } from "./issue-header";
import { IssueAttachments } from "./issue-attachments";
import { IssueSidebar } from "./issue-sidebar";
import { AiExecutionPanel } from "./ai-execution-panel";
import { ClientTranslationSection } from "./client-translation-section";
import { CommentSection, type CurrentUser } from "./comment-section";

interface Person {
  id: string;
  name: string;
}

interface IssueDetailProps {
  issue: IssueRow;
  comments: IssueCommentRow[];
  activities: IssueActivityRow[];
  people: Person[];
  attachments?: IssueAttachmentRow[];
  currentUser?: CurrentUser | null;
  currentTopic?: { id: string; title: string } | null;
  topics: { id: string; title: string }[];
}

export function IssueDetail({
  issue,
  comments,
  activities,
  people,
  attachments,
  currentUser,
  currentTopic,
  topics,
}: IssueDetailProps) {
  const [isPending, startTransition] = useTransition();

  // Optimistic issue state — sidebar selects reflect the new value instantly
  // while the server action persists in the background. We deliberately do
  // NOT disable the inputs anymore; they stay interactive for follow-up
  // changes (e.g. switch status then priority without waiting).
  const [optimisticIssue, applyOptimistic] = useOptimistic(
    issue,
    (current: IssueRow, patch: Partial<IssueRow>) => ({ ...current, ...patch }),
  );

  function handleFieldChange(field: string, value: string | null) {
    const previousStatus = optimisticIssue.status;

    startTransition(async () => {
      // Apply optimistic patch inside the transition so React keeps the UI
      // in sync with the pending state. For status changes, also bump the
      // sidebar counts so the badges reflect reality before the server
      // roundtrip completes.
      applyOptimistic({ [field]: value } as Partial<IssueRow>);
      if (field === "status" && value !== previousStatus) {
        issueCountStore.bump(issue.project_id, previousStatus, value);
      }

      const result = await updateIssueAction({ id: issue.id, [field]: value });
      if ("error" in result) {
        console.error(result.error);
        // Revert sidebar count on failure — React automatically reverts the
        // optimistic issue state at the end of the transition.
        if (field === "status" && value !== previousStatus) {
          issueCountStore.bump(issue.project_id, value, previousStatus);
        }
        return;
      }

      // Re-sync counts from the server after a successful status change so
      // any drift (e.g. from a concurrent edit) is corrected.
      if (field === "status") {
        issueCountStore.refresh(issue.project_id);
      }
    });
  }

  return (
    <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
      {/* Main content */}
      <div className="flex-1 p-6 lg:overflow-auto">
        <IssueHeader
          issueNumber={optimisticIssue.issue_number}
          title={optimisticIssue.title}
          status={optimisticIssue.status}
          priority={optimisticIssue.priority}
          type={optimisticIssue.type}
          component={optimisticIssue.component}
          projectId={optimisticIssue.project_id}
        />

        {optimisticIssue.description && (
          <section className="mb-6">
            <h2 className="mb-2">Beschrijving</h2>
            <div className="rounded-md border border-border bg-card p-4 text-sm whitespace-pre-wrap">
              {optimisticIssue.description}
            </div>
          </section>
        )}

        <ClientTranslationSection
          issueId={issue.id}
          initialClientTitle={issue.client_title}
          initialClientDescription={issue.client_description}
        />

        <AiExecutionPanel
          aiContext={
            optimisticIssue.ai_context as Parameters<typeof AiExecutionPanel>[0]["aiContext"]
          }
          aiResult={optimisticIssue.ai_result as Parameters<typeof AiExecutionPanel>[0]["aiResult"]}
          executionType={optimisticIssue.execution_type}
        />

        <IssueAttachments attachments={attachments ?? []} />

        <CommentSection
          issueId={issue.id}
          comments={comments}
          activities={activities}
          currentUser={currentUser}
        />
      </div>

      {/* Sidebar */}
      <IssueSidebar
        issue={optimisticIssue}
        people={people}
        onFieldChange={handleFieldChange}
        isPending={isPending}
        currentTopic={currentTopic ?? null}
        topics={topics}
      />
    </div>
  );
}
