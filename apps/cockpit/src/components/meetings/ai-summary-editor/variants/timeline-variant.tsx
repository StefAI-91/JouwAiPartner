"use client";

import { useEffect, useRef } from "react";
import { Button } from "@repo/ui/button";
import { Sparkles, Send, Check, X, Loader2, User, Zap } from "lucide-react";
import { DiffPreview } from "../diff-preview";
import { useMockChat, type ChatMessage } from "./shared";

/**
 * Variant B — Minimal timeline.
 *
 * No chat bubbles, no avatars blown up. Everything is a flat log with a left
 * gutter icon + timestamp, like Linear comments or GitHub activity feed.
 * Optimized for density: you see more context per screen, less visual noise.
 */
export function TimelineVariant() {
  const chat = useMockChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat.messages, chat.thinking]);

  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <p className="text-[13px] font-medium">Summary Editor</p>
          <span className="text-xs text-muted-foreground">· Discovery Markant</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {chat.appliedCount} wijziging{chat.appliedCount === 1 ? "" : "en"} toegepast
        </p>
      </div>

      {/* Log */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {chat.messages.map((msg, i) => (
          <LogEntry
            key={i}
            message={msg}
            onApply={() => chat.apply(i)}
            onReject={() => chat.reject(i)}
          />
        ))}
        {chat.thinking && (
          <div className="flex items-center gap-2 border-t border-border/40 px-4 py-3 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            AI denkt na...
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={chat.input}
            onChange={(e) => chat.setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                chat.send();
              }
            }}
            placeholder="Wat moet er veranderen?"
            disabled={chat.thinking}
            className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={chat.send}
            disabled={chat.thinking || !chat.input.trim()}
          >
            <Send className="size-3.5" />
            Versturen
          </Button>
        </div>
      </div>
    </div>
  );
}

function LogEntry({
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
      <div className="flex items-center gap-2 border-t border-border/40 px-4 py-2.5 text-xs text-muted-foreground">
        <div className="size-1.5 rounded-full bg-muted-foreground/30" />
        <span>{message.content}</span>
        <span className="ml-auto font-mono text-[11px]">{message.ts}</span>
      </div>
    );
  }

  const isUser = message.role === "user";
  const Icon = isUser ? User : Zap;
  const label = isUser ? "Jij" : "AI";

  return (
    <div className="border-t border-border/40 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3" />
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono">·</span>
        <span className="font-mono">{message.ts}</span>
      </div>
      <p className="text-[13px] leading-relaxed text-foreground">{message.content}</p>

      {message.role === "assistant" && message.proposal && (
        <div className="mt-2.5 space-y-2">
          <DiffPreview diffs={message.proposal.diffs} />
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-muted-foreground">{message.proposal.costHint}</p>
            <div className="flex gap-1.5">
              <Button size="xs" variant="outline" onClick={onReject}>
                <X className="size-3" data-icon="inline-start" />
                Verwerp
              </Button>
              <Button size="xs" onClick={onApply}>
                <Check className="size-3" data-icon="inline-start" />
                Toepassen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
