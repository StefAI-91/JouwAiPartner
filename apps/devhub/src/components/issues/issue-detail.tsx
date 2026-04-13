"use client";

import { useTransition } from "react";
import type {
  IssueRow,
  IssueCommentRow,
  IssueActivityRow,
  IssueAttachmentRow,
} from "@repo/database/queries/issues";
import { updateIssueAction } from "@/actions/issues";

import { IssueHeader } from "./issue-header";
import { IssueAttachments } from "./issue-attachments";
import { IssueSidebar } from "./issue-sidebar";
import { AiExecutionPanel } from "./ai-execution-panel";
import { CommentActivityFeed } from "@/components/comments/comment-list";
import { CommentForm } from "@/components/comments/comment-form";

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
}

export function IssueDetail({
  issue,
  comments,
  activities,
  people,
  attachments,
}: IssueDetailProps) {
  const [isPending, startTransition] = useTransition();

  function handleFieldChange(field: string, value: string | null) {
    startTransition(async () => {
      const result = await updateIssueAction({ id: issue.id, [field]: value });
      if ("error" in result) {
        console.error(result.error);
      }
    });
  }

  const rawReproSteps = (issue.ai_classification as Record<string, unknown> | undefined)
    ?.repro_steps;
  const reproSteps: string | null =
    typeof rawReproSteps === "string"
      ? rawReproSteps
      : Array.isArray(rawReproSteps)
        ? (rawReproSteps as string[]).join("\n")
        : null;

  return (
    <div className="flex flex-col lg:h-full lg:flex-row">
      {/* Main content */}
      <div className="flex-1 p-6 lg:overflow-auto">
        <IssueHeader
          issueNumber={issue.issue_number}
          title={issue.title}
          status={issue.status}
          priority={issue.priority}
          type={issue.type}
          component={issue.component}
          projectId={issue.project_id}
        />

        {issue.description && (
          <section className="mb-6">
            <h2 className="mb-2">Beschrijving</h2>
            <div className="rounded-md border border-border bg-card p-4 text-sm whitespace-pre-wrap">
              {issue.description}
            </div>
          </section>
        )}

        <AiExecutionPanel
          aiContext={issue.ai_context as Parameters<typeof AiExecutionPanel>[0]["aiContext"]}
          aiResult={issue.ai_result as Parameters<typeof AiExecutionPanel>[0]["aiResult"]}
          executionType={issue.execution_type}
        />

        <IssueAttachments attachments={attachments ?? []} />

        {reproSteps && (
          <section className="mb-6">
            <h2 className="mb-2">AI Reproductiestappen</h2>
            <div className="rounded-md border border-border bg-card p-4 text-sm whitespace-pre-wrap">
              {reproSteps}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3">Reacties &amp; activiteit</h2>
          <CommentActivityFeed comments={comments} activities={activities} />
          <div className="mt-4">
            <CommentForm issueId={issue.id} />
          </div>
        </section>
      </div>

      {/* Sidebar */}
      <IssueSidebar
        issue={issue}
        people={people}
        onFieldChange={handleFieldChange}
        isPending={isPending}
      />
    </div>
  );
}
