"use client";

import type { IssueRow } from "@repo/database/queries/issues";
import {
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  ISSUE_COMPONENTS,
  ISSUE_COMPONENT_LABELS,
} from "@repo/database/constants/issues";
import { SidebarSelect, SidebarAssignee } from "./sidebar-fields";
import { SidebarAiClassification } from "./sidebar-ai-classification";
import { SidebarDelete } from "./sidebar-delete";

interface Person {
  id: string;
  name: string;
}

interface IssueSidebarProps {
  issue: IssueRow;
  people: Person[];
  onFieldChange: (field: string, value: string | null) => void;
  isPending: boolean;
}

export function IssueSidebar({ issue, people, onFieldChange, isPending }: IssueSidebarProps) {
  const rawClassification = issue.ai_classification as Record<string, unknown> | undefined;
  const aiClassification =
    rawClassification && Object.keys(rawClassification).length > 0 ? rawClassification : null;

  return (
    <aside className="w-full shrink-0 border-t border-border bg-card p-4 lg:w-64 lg:border-l lg:border-t-0 lg:overflow-auto">
      <div className="space-y-4">
        <SidebarSelect
          label="Status"
          value={issue.status}
          options={ISSUE_STATUSES.map((s) => ({ value: s, label: ISSUE_STATUS_LABELS[s] }))}
          onChange={(v) => onFieldChange("status", v)}
          disabled={isPending}
        />

        <SidebarSelect
          label="Prioriteit"
          value={issue.priority}
          options={ISSUE_PRIORITIES.map((p) => ({ value: p, label: ISSUE_PRIORITY_LABELS[p] }))}
          onChange={(v) => onFieldChange("priority", v)}
          disabled={isPending}
        />

        <SidebarSelect
          label="Type"
          value={issue.type}
          options={ISSUE_TYPES.map((t) => ({ value: t, label: ISSUE_TYPE_LABELS[t] }))}
          onChange={(v) => onFieldChange("type", v)}
          disabled={isPending}
        />

        <SidebarSelect
          label="Component"
          value={issue.component ?? "unknown"}
          options={ISSUE_COMPONENTS.map((c) => ({
            value: c,
            label: ISSUE_COMPONENT_LABELS[c],
          }))}
          onChange={(v) => onFieldChange("component", v)}
          disabled={isPending}
        />

        {issue.severity && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Severity</span>
            <p className="text-sm capitalize">{issue.severity}</p>
          </div>
        )}

        <SidebarAssignee
          value={issue.assigned_to}
          people={people}
          onChange={(v) => onFieldChange("assigned_to", v)}
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

        <SidebarAiClassification
          issueId={issue.id}
          aiClassification={aiClassification}
          isPending={isPending}
        />

        <SidebarDelete issueId={issue.id} projectId={issue.project_id} isPending={isPending} />
      </div>
    </aside>
  );
}
