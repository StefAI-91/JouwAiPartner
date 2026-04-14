"use client";

import type { DiffBlock } from "./mock-responses";

interface DiffPreviewProps {
  diffs: DiffBlock[];
}

/**
 * Git-style diff rendering. Removed lines in red, added in green,
 * grouped per location (e.g. "Briefing", "Summary · Kernpunten").
 */
export function DiffPreview({ diffs }: DiffPreviewProps) {
  return (
    <div className="space-y-3">
      {diffs.map((block, i) => (
        <div key={i} className="rounded-lg border border-border/60 bg-muted/30 overflow-hidden">
          <div className="border-b border-border/60 bg-muted/50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {block.location}
          </div>
          <div className="p-2 font-mono text-xs leading-relaxed">
            {block.before.map((line, j) => (
              <div
                key={`before-${j}`}
                className="flex gap-2 rounded bg-red-50 px-2 py-0.5 text-red-900 dark:bg-red-950/40 dark:text-red-200"
              >
                <span className="select-none text-red-400">−</span>
                <span className="flex-1 whitespace-pre-wrap">{line}</span>
              </div>
            ))}
            {block.after.map((line, j) => (
              <div
                key={`after-${j}`}
                className="flex gap-2 rounded bg-emerald-50 px-2 py-0.5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                <span className="select-none text-emerald-400">+</span>
                <span className="flex-1 whitespace-pre-wrap">{line}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
