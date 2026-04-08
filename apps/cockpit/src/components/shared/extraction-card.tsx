"use client";

import { useState } from "react";
import { Pencil, Trash2, ListChecks, Clock, CalendarClock } from "lucide-react";
import { ConfidenceBar } from "@/components/shared/confidence-bar";
import {
  EXTRACTION_TYPE_COLORS,
  EXTRACTION_TYPE_ICONS,
  CATEGORY_BADGES,
} from "@/components/shared/extraction-constants";
import { PromoteTaskForm } from "./promote-task-form";
import type { PersonForAssignment } from "@repo/database/queries/people";

interface ExtractionMetadata {
  category?: "wij_leveren" | "wij_volgen_op" | "wachten_op_extern" | "wachten_op_beslissing";
  follow_up_contact?: string;
  assignee?: string;
  deadline?: string;
  suggested_deadline?: string;
  effort_estimate?: "small" | "medium" | "large";
  deadline_reasoning?: string;
  scope?: string;
  project?: string;
}

interface ExtractionCardProps {
  extraction: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    transcript_ref: string | null;
    metadata?: ExtractionMetadata | null;
  };
  readOnly?: boolean;
  showPromote?: boolean;
  isPromoted?: boolean;
  people?: PersonForAssignment[];
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onRefClick?: (ref: string) => void;
}

export function ExtractionCard({
  extraction,
  readOnly,
  showPromote,
  isPromoted,
  people,
  onEdit,
  onDelete,
  onRefClick,
}: ExtractionCardProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(extraction.content);
  const [promoted, setPromoted] = useState(isPromoted ?? false);
  const [showPromoteForm, setShowPromoteForm] = useState(false);
  const config = EXTRACTION_TYPE_COLORS[extraction.type] ?? EXTRACTION_TYPE_COLORS.action_item;
  const Icon = EXTRACTION_TYPE_ICONS[extraction.type];

  function handleSave() {
    setEditing(false);
    if (content !== extraction.content && onEdit) {
      onEdit(extraction.id, content);
    }
  }

  const canPromote = showPromote && extraction.type === "action_item" && !promoted;

  return (
    <div
      className="group/card relative rounded-xl bg-card p-4 shadow-sm"
      style={{ borderLeft: `3px solid ${config.color}` }}
    >
      {/* Top row: type label + action buttons */}
      <div className="mb-2 flex items-center justify-between">
        {Icon && (
          <div className="flex items-center gap-1.5">
            <Icon className="size-3.5" style={{ color: config.color }} />
            <span
              className="text-[10px] font-medium uppercase tracking-wide"
              style={{ color: config.color }}
            >
              {config.label}
            </span>
          </div>
        )}

        {!readOnly && !editing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Bewerken"
            >
              <Pencil className="size-3.5" />
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(extraction.id)}
                className="rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Verwijderen"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {!readOnly && editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSave();
            }
          }}
          autoFocus
          aria-label="Edit action item content"
          className="w-full resize-none rounded-lg border border-input bg-muted/30 p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          rows={3}
        />
      ) : (
        <p
          onClick={readOnly ? undefined : () => setEditing(true)}
          className={`text-sm leading-relaxed ${readOnly ? "" : "cursor-text hover:bg-muted/30 rounded-lg p-1 -m-1 transition-colors"}`}
        >
          {content}
        </p>
      )}

      {/* Category badge + metadata pills */}
      {extraction.metadata && extraction.type === "action_item" && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {extraction.metadata.category && CATEGORY_BADGES[extraction.metadata.category] && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                color: CATEGORY_BADGES[extraction.metadata.category].color,
                backgroundColor: CATEGORY_BADGES[extraction.metadata.category].bg,
              }}
            >
              {CATEGORY_BADGES[extraction.metadata.category].label}
            </span>
          )}
          {extraction.metadata.follow_up_contact && (
            <span className="flex items-center gap-0.5 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700">
              Opvolgen bij: {extraction.metadata.follow_up_contact}
            </span>
          )}
          {extraction.metadata.assignee && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {extraction.metadata.assignee}
            </span>
          )}
          {extraction.metadata.deadline ? (
            <span className="flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              <Clock className="size-2.5" />
              {extraction.metadata.deadline}
            </span>
          ) : extraction.metadata.suggested_deadline ? (
            <span
              className="flex items-center gap-0.5 rounded-full border border-dashed border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
              title={extraction.metadata.deadline_reasoning ?? "AI-geschatte deadline"}
            >
              <CalendarClock className="size-2.5" />
              {extraction.metadata.suggested_deadline}
              <span className="font-normal text-amber-500">geschat</span>
            </span>
          ) : null}
        </div>
      )}

      {extraction.transcript_ref && (
        <blockquote
          onClick={() => onRefClick?.(extraction.transcript_ref!)}
          className={`mt-2 border-l-2 border-muted pl-3 text-xs italic text-muted-foreground ${onRefClick ? "cursor-pointer hover:border-primary hover:text-foreground/70 transition-colors" : ""}`}
        >
          &ldquo;{extraction.transcript_ref}&rdquo;
        </blockquote>
      )}

      <div className="mt-2 flex items-center justify-between">
        <ConfidenceBar confidence={extraction.confidence} />

        {canPromote && !showPromoteForm && (
          <button
            type="button"
            onClick={() => setShowPromoteForm(true)}
            className="flex shrink-0 items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700 transition-colors hover:bg-green-100"
          >
            <ListChecks className="size-3" />
            Maak taak
          </button>
        )}

        {showPromote && extraction.type === "action_item" && promoted && (
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-[11px] font-medium text-green-700">
            <ListChecks className="size-3" />
            Taak aangemaakt
          </span>
        )}
      </div>

      {/* Promote form */}
      {canPromote && showPromoteForm && (
        <PromoteTaskForm
          extractionId={extraction.id}
          title={extraction.content}
          people={people ?? []}
          defaultDueDate={extraction.metadata?.deadline ?? extraction.metadata?.suggested_deadline}
          defaultAssignee={
            extraction.metadata?.assignee
              ? (people?.find(
                  (p) => p.name.toLowerCase() === extraction.metadata?.assignee?.toLowerCase(),
                )?.id ?? null)
              : null
          }
          onPromoted={() => {
            setPromoted(true);
            setShowPromoteForm(false);
          }}
          onCancel={() => setShowPromoteForm(false)}
        />
      )}
    </div>
  );
}
