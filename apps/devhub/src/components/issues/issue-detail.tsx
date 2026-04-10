"use client";

import { useTransition } from "react";
import type {
  IssueRow,
  IssueCommentRow,
  IssueActivityRow,
  IssueAttachmentRow,
} from "@repo/database/queries/issues";
import { updateIssueAction } from "@/actions/issues";
import { startAiExecution } from "@/actions/execute";
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
      } else if (field === "status") {
        window.dispatchEvent(new Event("issues-changed"));
        if (value === "in_progress" && issue.execution_type !== "ai") {
          startAiExecution({ issueId: issue.id });
        }
      }
    });
  }

  const rawAiClassification = issue.ai_classification as Record<string, unknown> | undefined;
  const aiClassification =
    rawAiClassification && Object.keys(rawAiClassification).length > 0 ? rawAiClassification : null;
  const rawReproSteps = aiClassification?.repro_steps;
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

        {/* Description */}
        {issue.description && (
          <section className="mb-6">
            <h2 className="mb-2">Beschrijving</h2>
            <div className="rounded-md border border-border bg-card p-4 text-sm whitespace-pre-wrap">
              {issue.description}
            </div>
          </section>
        )}

        {/* AI Execution */}
        <AiExecutionPanel
          aiContext={issue.ai_context as Parameters<typeof AiExecutionPanel>[0]["aiContext"]}
          aiResult={issue.ai_result as Parameters<typeof AiExecutionPanel>[0]["aiResult"]}
          executionType={issue.execution_type}
        />

        {/* Attachments */}
        <IssueAttachments attachments={attachments ?? []} />

        {/* AI Repro Steps */}
        {reproSteps && (
          <section className="mb-6">
            <h2 className="mb-2">AI Reproductiestappen</h2>
            <div className="rounded-md border border-border bg-card p-4 text-sm whitespace-pre-wrap">
              {reproSteps}
            </div>
          </section>
        )}

        {/* Comments & Activity */}
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
        issueId={issue.id}
        projectId={issue.project_id}
        status={issue.status}
        priority={issue.priority}
        type={issue.type}
        component={issue.component}
        severity={issue.severity}
        assignedTo={issue.assigned_to}
        labels={issue.labels}
        source={issue.source}
        createdAt={issue.created_at}
        closedAt={issue.closed_at}
        aiClassification={aiClassification}
        people={people}
        onFieldChange={handleFieldChange}
        isPending={isPending}
      />
    </div>
  );
}
