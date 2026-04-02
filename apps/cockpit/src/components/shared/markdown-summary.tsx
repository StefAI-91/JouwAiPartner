"use client";

import { useState, useMemo, useCallback } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";

const COLLAPSED_MAX_HEIGHT = 160; // px

interface MarkdownSummaryProps {
  content: string;
  editable?: boolean;
  onEdit?: (content: string) => void;
}

/** Split markdown into sections by ## headings */
interface Section {
  heading: string;
  body: string;
  raw: string; // original markdown including heading
}

// Match ## headings or standalone **bold** lines (sub-sections)
const HEADING_PATTERN = /^#{1,3}\s+/;
const BOLD_SECTION_PATTERN = /^-?\s*\*\*(.+?)\*\*/;

function isSectionStart(line: string): string | null {
  const headingMatch = line.match(HEADING_PATTERN);
  if (headingMatch) {
    return line.replace(HEADING_PATTERN, "").replace(/\*\*/g, "").trim();
  }
  const boldMatch = line.match(BOLD_SECTION_PATTERN);
  if (boldMatch) {
    return boldMatch[1].trim();
  }
  return null;
}

function parseSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  function flush() {
    const raw = currentLines.join("\n").trim();
    if (raw) {
      sections.push({
        heading: currentHeading,
        body: currentHeading ? currentLines.slice(1).join("\n").trim() : raw,
        raw,
      });
    }
  }

  for (const line of lines) {
    const sectionHeading = isSectionStart(line);
    if (sectionHeading) {
      flush();
      currentHeading = sectionHeading;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}

function rebuildMarkdown(sections: Section[]): string {
  return sections.map((s) => s.raw).join("\n\n");
}

const PROSE_CLASSES = [
  "prose prose-sm max-w-none text-muted-foreground",
  // H2: main section headers — bold anchors with top divider
  "[&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-0 [&_h2]:mb-1.5 [&_h2]:tracking-tight",
  // H3: sub-headers — compact, high contrast anchor points
  "[&_h3]:text-[13px] [&_h3]:font-medium [&_h3]:text-foreground/80 [&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:leading-snug",
  // Lists: clear bullet styling with spacing between items
  "[&_ul]:my-1.5 [&_ul]:pl-4 [&_ul]:space-y-1",
  "[&_li]:text-sm [&_li]:leading-relaxed [&_li]:marker:text-foreground/30",
  // Blockquotes: distinct visual block for transcript quotes
  "[&_blockquote]:my-2 [&_blockquote]:ml-1 [&_blockquote]:rounded-md [&_blockquote]:border-l-2 [&_blockquote]:border-primary/20 [&_blockquote]:bg-primary/5 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:not-italic",
  "[&_blockquote_p]:text-[13px] [&_blockquote_p]:leading-relaxed [&_blockquote_p]:text-foreground/60 [&_blockquote_p]:my-0",
  // Paragraphs & inline
  "[&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1",
  "[&_strong]:text-foreground/80",
].join(" ");

export function MarkdownSummary({ content, editable, onEdit }: MarkdownSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  // Track overrides per section index from user edits
  const [overrides, setOverrides] = useState<Map<number, string>>(new Map());

  // Derive sections from content prop + local overrides
  const sections = useMemo(() => {
    const base = parseSections(content);
    if (overrides.size === 0) return base;
    return base.map((s, i) => {
      const override = overrides.get(i);
      if (override === undefined) return s;
      const heading = isSectionStart(override.split("\n")[0]) ?? s.heading;
      const bodyLines = override.split("\n").slice(1).join("\n").trim();
      return { heading, body: bodyLines || override, raw: override };
    });
  }, [content, overrides]);

  const startEdit = useCallback(
    (index: number) => {
      setExpanded(true);
      setEditingIndex(index);
      setEditValue(sections[index].raw);
    },
    [sections],
  );

  function cancelEdit() {
    setEditingIndex(null);
    setEditValue("");
  }

  function saveEdit() {
    if (editingIndex === null) return;

    const trimmed = editValue.trim();
    setOverrides((prev) => new Map(prev).set(editingIndex, trimmed));
    setEditingIndex(null);
    setEditValue("");

    // Rebuild full markdown with the edit applied
    const updated = sections.map((s, i) => (i === editingIndex ? { ...s, raw: trimmed } : s));

    const newMarkdown = rebuildMarkdown(updated);
    if (newMarkdown !== content && onEdit) {
      onEdit(newMarkdown);
    }
  }

  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Summary</h3>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              Minder <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              Meer lezen <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      </div>

      <div
        className="relative overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: expanded ? "none" : `${COLLAPSED_MAX_HEIGHT}px` }}
      >
        <div className="space-y-0">
          {sections.map((section, index) => {
            // Add divider before top-level sections (h2 or bold headers), skip first
            const raw = section.raw.trimStart();
            const isTopLevel = raw.startsWith("## ") || (!raw.startsWith("### ") && BOLD_SECTION_PATTERN.test(raw.split("\n")[0]));
            const showDivider = isTopLevel && index > 0;

            return (
            <div key={index} className="group/section relative">
              {showDivider && (
                <div className="mx-1 my-3 border-t border-border/50" />
              )}
              {editingIndex === index ? (
                <div className="rounded-lg border border-primary/30 bg-white p-3">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    aria-label={`Edit section: ${section.heading || "intro"}`}
                    className="w-full resize-y rounded-md border border-input bg-muted/20 p-2 text-sm leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    rows={Math.max(3, editValue.split("\n").length + 1)}
                  />
                  <div className="mt-2 flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="size-3" />
                      Annuleren
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Check className="size-3" />
                      Opslaan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/40">
                  {editable && (
                    <button
                      type="button"
                      onClick={() => startEdit(index)}
                      className="absolute right-1 top-1 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/section:opacity-100"
                      title={`Bewerk: ${section.heading || "intro"}`}
                    >
                      <Pencil className="size-3" />
                    </button>
                  )}
                  <div className={PROSE_CLASSES}>
                    <Markdown remarkPlugins={[remarkGfm]}>{section.raw}</Markdown>
                  </div>
                </div>
              )}
            </div>
          );
          })}
        </div>

        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-muted/50 to-transparent" />
        )}
      </div>
    </div>
  );
}
