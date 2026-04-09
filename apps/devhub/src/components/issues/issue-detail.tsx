"use client";

import { useState } from "react";
import type {
  IssueRow,
  IssueCommentRow,
  IssueActivityRow,
  IssueAttachmentRow,
} from "@repo/database/queries/issues";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { TypeBadge } from "@/components/shared/type-badge";
import { ComponentBadge } from "@/components/shared/component-badge";
import { CommentActivityFeed } from "@/components/comments/comment-list";
import { CommentForm } from "@/components/comments/comment-form";
import { IssueSidebar } from "./issue-sidebar";
import { IssueAttachments } from "./issue-attachments";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
  const [error, setError] = useState<string | null>(null);

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
        {/* Error toast */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-destructive/60 hover:text-destructive"
            >
              &times;
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <Link
            href="/issues"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Terug naar issues
          </Link>

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2">
                <span className="font-mono text-base font-normal text-muted-foreground">
                  #{issue.issue_number}
                </span>
                {issue.title}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={issue.status} />
                <PriorityBadge priority={issue.priority} />
                <TypeBadge type={issue.type} />
                {issue.component && <ComponentBadge component={issue.component} />}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {issue.description && (
          <section className="mb-6">
            <h2 className="mb-2">Beschrijving</h2>
            <div className="rounded-md border border-border bg-card p-4 text-sm whitespace-pre-wrap">
              {issue.description}
            </div>
          </section>
        )}

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
      <IssueSidebar issue={issue} people={people} onError={setError} />
    </div>
  );
}
