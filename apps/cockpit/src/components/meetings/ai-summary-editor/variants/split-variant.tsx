"use client";

import { useEffect, useRef, useMemo } from "react";
import { Button } from "@repo/ui/button";
import { Sparkles, Send, Check, X, Loader2 } from "lucide-react";
import { DiffPreview } from "../diff-preview";
import { useMockChat, MOCK_SUMMARY_MD, type ChatMessage } from "./shared";

/**
 * Variant C — Split editor.
 *
 * Two panes: current summary on the left (the document), chat + AI proposals
 * on the right (the assistant). When there's an active AI proposal, the
 * relevant sections in the left pane are highlighted so you see *where* the
 * edit lands before you apply it. Notion / Google Docs with AI vibe.
 */
export function SplitVariant() {
  const chat = useMockChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat.messages, chat.thinking]);

  // Find active proposal (if any) so we can highlight affected sections
  const activeLocations = useMemo(() => {
    const active = [...chat.messages].reverse().find((m) => m.role === "assistant" && m.proposal);
    if (!active || active.role !== "assistant" || !active.proposal) return new Set<string>();
    return new Set(active.proposal.diffs.map((d) => sectionOf(d.location)));
  }, [chat.messages]);

  return (
    <div className="grid h-[640px] grid-cols-5 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      {/* Left pane: current summary */}
      <div className="col-span-3 flex flex-col border-r border-border/60">
        <div className="border-b border-border/60 px-4 py-2.5">
          <p className="text-[13px] font-medium">Huidige summary</p>
          <p className="text-xs text-muted-foreground">Discovery Markant — 14 april</p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm leading-relaxed">
          {parseMarkdownSections(MOCK_SUMMARY_MD).map((section, i) => (
            <div
              key={i}
              className={
                activeLocations.has(section.heading)
                  ? "rounded-md bg-amber-50 px-2 py-1.5 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900"
                  : ""
              }
            >
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {section.heading}
              </p>
              <div className="whitespace-pre-wrap text-[13px]">{section.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right pane: AI chat */}
      <div className="col-span-2 flex flex-col bg-muted/20">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
          <Sparkles className="size-3.5 text-primary" />
          <p className="text-[13px] font-medium">AI Assistent</p>
          {chat.appliedCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {chat.appliedCount} toegepast
            </span>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {chat.messages.map((msg, i) => (
            <SplitMessage
              key={i}
              message={msg}
              onApply={() => chat.apply(i)}
              onReject={() => chat.reject(i)}
            />
          ))}
          {chat.thinking && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              AI denkt na...
            </div>
          )}
        </div>

        <div className="border-t border-border/60 p-2.5">
          <div className="relative">
            <textarea
              value={chat.input}
              onChange={(e) => chat.setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  chat.send();
                }
              }}
              placeholder="Instrueer de AI..."
              rows={2}
              disabled={chat.thinking}
              className="w-full resize-none rounded-lg border border-border/60 bg-background px-2.5 py-2 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
            />
            <Button
              size="icon-sm"
              onClick={chat.send}
              disabled={chat.thinking || !chat.input.trim()}
              className="absolute bottom-1.5 right-1.5"
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SplitMessage({
  message,
  onApply,
  onReject,
}: {
  message: ChatMessage;
  onApply: () => void;
  onReject: () => void;
}) {
  if (message.role === "system") {
    return (
      <div className="rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
        {message.content}
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="rounded-lg bg-primary px-3 py-2 text-[13px] text-primary-foreground">
        {message.content}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-background p-2.5">
      <p className="mb-2 text-[13px]">{message.content}</p>
      {message.proposal && (
        <>
          <DiffPreview diffs={message.proposal.diffs} />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">{message.proposal.costHint}</p>
            <div className="flex gap-1">
              <Button size="xs" variant="outline" onClick={onReject}>
                <X className="size-3" />
              </Button>
              <Button size="xs" onClick={onApply}>
                <Check className="size-3" data-icon="inline-start" />
                Pas toe
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Map a DiffBlock.location ("Summary · Kernpunten") to the matching section
 * heading in the mock summary ("Kernpunten"), so we can highlight correctly.
 */
function sectionOf(location: string): string {
  if (location.toLowerCase().includes("briefing")) return "Briefing";
  if (location.toLowerCase().includes("kernpunten")) return "Kernpunten";
  if (location.toLowerCase().includes("deelnemers")) return "Deelnemers";
  if (location.toLowerCase().includes("vervolgstappen")) return "Vervolgstappen";
  return location;
}

interface ParsedSection {
  heading: string;
  body: string;
}

/** Naive markdown parser — only splits on ## headings for our demo summary. */
function parseMarkdownSections(md: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = md.split("\n");
  let current: ParsedSection | null = null;

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      if (current) sections.push(current);
      current = { heading: match[1].trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);

  return sections
    .map((s) => ({ heading: s.heading, body: s.body.trim() }))
    .filter((s) => s.body.length > 0);
}
