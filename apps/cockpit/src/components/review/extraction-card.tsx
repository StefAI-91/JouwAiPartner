"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfidenceBar } from "@/components/shared/confidence-bar";
import {
  EXTRACTION_TYPE_COLORS,
  EXTRACTION_TYPE_ICONS,
} from "@/components/shared/extraction-constants";

interface ExtractionCardProps {
  extraction: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    transcript_ref: string | null;
  };
  readOnly?: boolean;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onRefClick?: (ref: string) => void;
}

export function ExtractionCard({
  extraction,
  readOnly,
  onEdit,
  onDelete,
  onRefClick,
}: ExtractionCardProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(extraction.content);
  const config = EXTRACTION_TYPE_COLORS[extraction.type] ?? EXTRACTION_TYPE_COLORS.insight;
  const Icon = EXTRACTION_TYPE_ICONS[extraction.type];

  function handleSave() {
    setEditing(false);
    if (content !== extraction.content && onEdit) {
      onEdit(extraction.id, content);
    }
  }

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
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/card:opacity-100">
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

      <div className="mt-2">
        <ConfidenceBar confidence={extraction.confidence} />
      </div>
    </div>
  );
}
