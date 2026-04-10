"use client";

import { useState, useTransition } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { deleteIssueAction } from "@/actions/issues";
import { classifyIssueAction } from "@/actions/classify";
import { Button } from "@repo/ui/button";
import {
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
} from "@repo/database/constants/issues";

// ── Shared Sidebar Controls ──

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

// ── Types ──

interface Person {
  id: string;
  name: string;
}

interface IssueSidebarProps {
  issueId: string;
  projectId: string;
  status: string;
  priority: string;
  type: string;
  component: string | null;
  severity: string | null;
  assignedTo: string | null;
  labels: string[];
  source: string;
  createdAt: string;
  closedAt: string | null;
  aiClassification: Record<string, unknown> | null;
  people: Person[];
  onFieldChange: (field: string, value: string | null) => void;
  isPending: boolean;
}

// ── Main Sidebar ──

export function IssueSidebar({
  issueId,
  projectId,
  status,
  priority,
  type,
  component,
  severity,
  assignedTo,
  labels,
  source,
  createdAt,
  closedAt,
  aiClassification,
  people,
  onFieldChange,
  isPending,
}: IssueSidebarProps) {
  const [, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);

  function handleClassify() {
    setIsClassifying(true);
    startTransition(async () => {
      const result = await classifyIssueAction({ id: issueId });
      if ("error" in result) {
        console.error(result.error);
      }
      setIsClassifying(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteIssueAction({ id: issueId });
      if ("error" in result) {
        console.error(result.error);
      } else {
        window.location.href = `/issues?project=${projectId}`;
      }
    });
  }

  return (
    <aside className="w-full shrink-0 border-t border-border bg-card p-4 lg:w-64 lg:border-l lg:border-t-0 lg:overflow-auto">
      <div className="space-y-4">
        <SidebarSelect
          label="Status"
          value={status}
          options={ISSUE_STATUSES.map((s) => ({ value: s, label: ISSUE_STATUS_LABELS[s] }))}
          onChange={(v) => onFieldChange("status", v)}
          disabled={isPending}
        />

        <SidebarSelect
          label="Prioriteit"
          value={priority}
          options={ISSUE_PRIORITIES.map((p) => ({ value: p, label: ISSUE_PRIORITY_LABELS[p] }))}
          onChange={(v) => onFieldChange("priority", v)}
          disabled={isPending}
        />

        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <p className="text-sm capitalize">{type.replace("_", " ")}</p>
        </div>

        {component && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Component</span>
            <p className="text-sm capitalize">{component.replace("_", " ")}</p>
          </div>
        )}

        {severity && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Severity</span>
            <p className="text-sm capitalize">{severity}</p>
          </div>
        )}

        <SidebarAssignee
          value={assignedTo}
          people={people}
          onChange={(v) => onFieldChange("assigned_to", v)}
          disabled={isPending}
        />

        {/* Labels */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Labels</span>
          {labels && labels.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {labels.map((label) => (
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
          <p className="text-sm capitalize">{source}</p>
        </div>

        {/* Dates */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Aangemaakt</span>
          <p className="text-xs text-muted-foreground">
            {new Date(createdAt).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {closedAt && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Gesloten</span>
            <p className="text-xs text-muted-foreground">
              {new Date(closedAt).toLocaleDateString("nl-NL", {
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
              {typeof aiClassification.type === "string" && <p>AI type: {aiClassification.type}</p>}
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
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
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
  );
}
