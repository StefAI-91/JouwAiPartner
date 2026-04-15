"use client";

import { useEffect, useRef } from "react";
import { Button } from "@repo/ui/button";
import { Sparkles, Send, Check, X, Loader2, History } from "lucide-react";
import { DiffPreview } from "../diff-preview";
import { useMockChat, type ChatMessage } from "./shared";

/**
 * Variant A — Bubble chat.
 *
 * Chat app aesthetic with user bubbles on the right, AI on the left with an
 * avatar. This is the style that shipped in the drawer mockup. Playful,
 * familiar from WhatsApp / ChatGPT.
 */
export function BubbleVariant() {
  const chat = useMockChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat.messages, chat.thinking]);

  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">AI Summary Editor</p>
            <p className="text-xs text-muted-foreground">Discovery Markant — 14 april</p>
          </div>
        </div>
        {chat.appliedCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
            <History className="size-3" />
            {chat.appliedCount}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {chat.messages.map((msg, i) => (
          <Bubble
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

      {/* Composer */}
      <div className="border-t border-border/60 p-3">
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
            placeholder="Zeg wat er moet veranderen..."
            rows={2}
            disabled={chat.thinking}
            className="w-full resize-none rounded-lg border border-border/60 bg-background px-3 py-2 pr-11 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
          />
          <Button
            size="icon-sm"
            onClick={chat.send}
            disabled={chat.thinking || !chat.input.trim()}
            className="absolute bottom-2 right-2"
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({
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
      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        {message.content}
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-3" />
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm leading-relaxed">{message.content}</p>
        {message.proposal && (
          <>
            <DiffPreview diffs={message.proposal.diffs} />
            <p className="text-[11px] text-muted-foreground">{message.proposal.costHint}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button size="sm" onClick={onApply}>
                <Check className="size-3.5" data-icon="inline-start" />
                Toepassen
              </Button>
              <Button size="sm" variant="outline" onClick={onReject}>
                <X className="size-3.5" data-icon="inline-start" />
                Verwerpen
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
