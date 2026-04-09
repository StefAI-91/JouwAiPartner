"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { IssueRow, IssueCommentRow, IssueActivityRow } from "@repo/database/queries/issues";
import { updateIssueAction, deleteIssueAction } from "@/actions/issues";
import { classifyIssueAction } from "@/actions/classify";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { TypeBadge } from "@/components/shared/type-badge";
import { ComponentBadge } from "@/components/shared/component-badge";
import { CommentActivityFeed } from "@/components/comments/comment-list";
import { CommentForm } from "@/components/comments/comment-form";
import { Button } from "@repo/ui/button";
import { ArrowLeft, Trash2, Sparkles } from "lucide-react";
import Link from "next/link";

import {
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
} from "@repo/database/constants/issues";

interface Person {
  id: string;
  name: string;
}

interface IssueDetailProps {
  issue: IssueRow;
  comments: IssueCommentRow[];
  activities: IssueActivityRow[];
  people: Person[];
}

// ── Sidebar Dropdown ──

function SidebarSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SidebarAssignee({
  value,
  people,
  onChange,
  disabled,
}: {
  value: string | null;
  people: Person[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">Toegewezen aan</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
      >
        <option value="">Niet toegewezen</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Main Component ──

export function IssueDetail({ issue, comments, activities, people }: IssueDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);

  function handleClassify() {
    setIsClassifying(true);
    startTransition(async () => {
      const result = await classifyIssueAction({ id: issue.id });
      if ("error" in result) {
        console.error(result.error);
      }
      setIsClassifying(false);
    });
  }

  function handleFieldChange(field: string, value: string | null) {
    startTransition(async () => {
      const result = await updateIssueAction({ id: issue.id, [field]: value });
      if ("error" in result) {
        console.error(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteIssueAction({ id: issue.id });
      if ("error" in result) {
        console.error(result.error);
      } else {
        router.push("/issues");
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
      <aside className="w-full shrink-0 border-t border-border bg-card p-4 lg:w-64 lg:border-l lg:border-t-0 lg:overflow-auto">
        <div className="space-y-4">
          <SidebarSelect
            label="Status"
            value={issue.status}
            options={ISSUE_STATUSES.map((s) => ({ value: s, label: ISSUE_STATUS_LABELS[s] }))}
            onChange={(v) => handleFieldChange("status", v)}
            disabled={isPending}
          />

          <SidebarSelect
            label="Prioriteit"
            value={issue.priority}
            options={ISSUE_PRIORITIES.map((p) => ({ value: p, label: ISSUE_PRIORITY_LABELS[p] }))}
            onChange={(v) => handleFieldChange("priority", v)}
            disabled={isPending}
          />

          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Type</span>
            <p className="text-sm capitalize">{issue.type.replace("_", " ")}</p>
          </div>

          {issue.component && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Component</span>
              <p className="text-sm capitalize">{issue.component.replace("_", " ")}</p>
            </div>
          )}

          {issue.severity && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Severity</span>
              <p className="text-sm capitalize">{issue.severity}</p>
            </div>
          )}

          <SidebarAssignee
            value={issue.assigned_to}
            people={people}
            onChange={(v) => handleFieldChange("assigned_to", v)}
            disabled={isPending}
          />

          {/* Labels */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Labels</span>
            {issue.labels && issue.labels.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {issue.labels.map((label) => (
                  <span
                    key={label}
                    className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60">Geen labels</p>
            )}
          </div>

          {/* Source */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Bron</span>
            <p className="text-sm capitalize">{issue.source}</p>
          </div>

          {/* Dates */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Aangemaakt</span>
            <p className="text-xs text-muted-foreground">
              {new Date(issue.created_at).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {issue.closed_at && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Gesloten</span>
              <p className="text-xs text-muted-foreground">
                {new Date(issue.closed_at).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          {/* AI Classification */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">AI Classificatie</span>
            {aiClassification ? (
              <div className="text-xs text-muted-foreground space-y-0.5">
                {typeof aiClassification.confidence === "number" && (
                  <p>Confidence: {Math.round(aiClassification.confidence * 100)}%</p>
                )}
                {typeof aiClassification.type === "string" && (
                  <p>AI type: {aiClassification.type}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60">Nog niet geclassificeerd</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClassify}
              disabled={isPending || isClassifying}
              className="text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="size-3.5" />
              {isClassifying ? "Bezig..." : aiClassification ? "Herclassificeer" : "Classificeer"}
            </Button>
          </div>

          {/* Delete */}
          <div className="border-t border-border pt-4">
            {showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-xs text-destructive">
                  Weet je zeker dat je dit issue wilt verwijderen?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    Verwijderen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                    Annuleren
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="size-3.5" />
                Verwijder issue
              </Button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
