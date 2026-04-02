"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, ListChecks, Check, UserCircle, Calendar } from "lucide-react";
import { ConfidenceBar } from "@/components/shared/confidence-bar";
import {
  EXTRACTION_TYPE_COLORS,
  EXTRACTION_TYPE_ICONS,
} from "@/components/shared/extraction-constants";
import { promoteToTaskAction } from "@/actions/tasks";

interface PersonOption {
  id: string;
  name: string;
  team: string | null;
  organization_name: string | null;
}

interface ExtractionCardProps {
  extraction: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    transcript_ref: string | null;
  };
  readOnly?: boolean;
  showPromote?: boolean;
  isPromoted?: boolean;
  people?: PersonOption[];
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
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const config = EXTRACTION_TYPE_COLORS[extraction.type] ?? EXTRACTION_TYPE_COLORS.insight;
  const Icon = EXTRACTION_TYPE_ICONS[extraction.type];

  const [promoteError, setPromoteError] = useState<string | null>(null);

  const teammates = people?.filter((p) => p.team) ?? [];
  const clients = people?.filter((p) => !p.team) ?? [];

  function handlePromote() {
    setPromoteError(null);
    startTransition(async () => {
      const result = await promoteToTaskAction({
        extractionId: extraction.id,
        title: extraction.content,
        assignedTo: assignedTo,
        dueDate: dueDate,
      });
      if ("success" in result) {
        setPromoted(true);
        setShowPromoteForm(false);
      } else {
        setPromoteError(result.error);
      }
    });
  }

  function handleSave() {
    setEditing(false);
    if (content !== extraction.content && onEdit) {
      onEdit(extraction.id, content);
    }
  }

  const canPromote = showPromote && extraction.type === "action_item" && !promoted;

  return (
    <div
      className="group/card relative rounded-xl bg-white p-4 shadow-sm"
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
          aria-label={`Edit ${config.label.toLowerCase()} content`}
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

        {/* Promote button */}
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

        {/* Promoted badge */}
        {showPromote && extraction.type === "action_item" && promoted && (
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-[11px] font-medium text-green-700">
            <ListChecks className="size-3" />
            Taak aangemaakt
          </span>
        )}
      </div>

      {/* Inline promote form */}
      {canPromote && showPromoteForm && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50/50 p-3">
          <p className="mb-2 text-[11px] font-medium text-green-800">Taak aanmaken</p>
          <div className="flex flex-wrap items-end gap-2">
            {/* Person selector */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <UserCircle className="size-3" />
                Toewijzen aan
              </label>
              <select
                value={assignedTo ?? ""}
                onChange={(e) => setAssignedTo(e.target.value || null)}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Niemand</option>
                {teammates.length > 0 && (
                  <optgroup label="Team">
                    {teammates.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.team}
                      </option>
                    ))}
                  </optgroup>
                )}
                {clients.length > 0 && (
                  <optgroup label="Klant">
                    {clients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.organization_name ? ` — ${p.organization_name}` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Due date */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <Calendar className="size-3" />
                Deadline
              </label>
              <input
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value || null)}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Actions */}
            <button
              type="button"
              onClick={handlePromote}
              disabled={isPending}
              className="flex h-7 items-center gap-1 rounded-md bg-green-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="size-3" />
              {isPending ? "Bezig..." : "Aanmaken"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPromoteForm(false);
                setAssignedTo(null);
                setDueDate(null);
                setPromoteError(null);
              }}
              className="flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Annuleren
            </button>
          </div>
          {promoteError && (
            <p className="mt-2 text-xs text-red-600">{promoteError}</p>
          )}
        </div>
      )}
    </div>
  );
}
