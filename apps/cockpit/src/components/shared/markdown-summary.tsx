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
    if (line.match(/^#{1,3}\s+/)) {
      flush();
      currentHeading = line
        .replace(/^#{1,3}\s+/, "")
        .replace(/\*\*/g, "")
        .trim();
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

const PROSE_CLASSES =
  "prose prose-sm max-w-none text-muted-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground/80 [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground/70 [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:my-1 [&_ul]:pl-4 [&_li]:text-sm [&_li]:leading-relaxed [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1 [&_strong]:text-foreground/80";

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
      const headingLine = s.raw.split("\n")[0];
      const hasHeading = headingLine.match(/^#{1,3}\s+/);
      const newRaw = hasHeading ? `${headingLine}\n${override}` : override;
      return { heading: s.heading, body: override, raw: newRaw };
    });
  }, [content, overrides]);

  const startEdit = useCallback(
    (index: number) => {
      setExpanded(true);
      setEditingIndex(index);
      setEditValue(sections[index].body);
    },
    [sections],
  );

  function cancelEdit() {
    setEditingIndex(null);
    setEditValue("");
  }

  function saveEdit() {
    if (editingIndex === null) return;

    setOverrides((prev) => new Map(prev).set(editingIndex, editValue.trim()));
    setEditingIndex(null);
    setEditValue("");

    // Rebuild full markdown with the edit applied
    const updated = sections.map((s, i) => {
      if (i !== editingIndex) return s;
      const headingLine = s.raw.split("\n")[0];
      const hasHeading = headingLine.match(/^#{1,3}\s+/);
      const newRaw = hasHeading ? `${headingLine}\n${editValue.trim()}` : editValue.trim();
      return { ...s, body: editValue.trim(), raw: newRaw };
    });

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
        <div className="space-y-1">
          {sections.map((section, index) => (
            <div key={index} className="group/section relative">
              {editingIndex === index ? (
                <div className="rounded-lg border border-primary/30 bg-white p-3">
                  {section.heading && (
                    <p className="mb-2 text-sm font-semibold text-foreground/80">
                      {section.heading}
                    </p>
                  )}
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
          ))}
        </div>

        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-muted/50 to-transparent" />
        )}
      </div>
    </div>
  );
}
