"use client";

import { useState } from "react";
import { ConfidenceBar } from "@/components/shared/confidence-bar";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  decision: { label: "Decision", color: "#3B82F6", bg: "#DBEAFE" },
  action_item: { label: "Action Item", color: "#16A34A", bg: "#DCFCE7" },
  need: { label: "Need", color: "#A855F7", bg: "#F3E8FF" },
  insight: { label: "Insight", color: "#6B7280", bg: "#F3F4F6" },
};

interface ExtractionCardProps {
  extraction: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    transcript_ref: string | null;
  };
  onEdit?: (id: string, content: string) => void;
}

export function ExtractionCard({ extraction, onEdit }: ExtractionCardProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(extraction.content);
  const config = TYPE_CONFIG[extraction.type] ?? TYPE_CONFIG.insight;

  function handleSave() {
    setEditing(false);
    if (content !== extraction.content && onEdit) {
      onEdit(extraction.id, content);
    }
  }

  return (
    <div
      className="rounded-xl bg-white p-4 shadow-sm"
      style={{ borderLeft: `3px solid ${config.color}` }}
    >
      {editing ? (
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
          onClick={() => setEditing(true)}
          className="cursor-text text-sm leading-relaxed hover:bg-muted/30 rounded-lg p-1 -m-1 transition-colors"
        >
          {content}
        </p>
      )}

      {extraction.transcript_ref && (
        <blockquote className="mt-2 border-l-2 border-muted pl-3 text-xs italic text-muted-foreground">
          {extraction.transcript_ref}
        </blockquote>
      )}

      <div className="mt-2">
        <ConfidenceBar confidence={extraction.confidence} />
      </div>
    </div>
  );
}
