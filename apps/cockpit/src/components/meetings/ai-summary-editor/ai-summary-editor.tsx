"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@repo/ui/sheet";
import { Button } from "@repo/ui/button";
import { Sparkles, Send, Check, X, Loader2, History, Undo2 } from "lucide-react";
import { DiffPreview } from "./diff-preview";
import { MOCK_THINK_MS, pickMockProposal, type MockProposal } from "./mock-responses";

/** Chat messages in the conversation. */
type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; proposal?: MockProposal }
  | { role: "system"; content: string };

interface AiSummaryEditorProps {
  /** Meeting title — shown in drawer header for context. */
  meetingTitle: string;
}

/**
 * MOCKUP — Floating "Bewerk met AI" button that opens a chat drawer.
 * Lets the user type natural-language instructions, see proposed diffs,
 * and apply/reject them per turn. No real AI call — see mock-responses.ts.
 */
export function AiSummaryEditor({ meetingTitle }: AiSummaryEditorProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        'Hoi! Zeg wat er moet veranderen aan deze meeting. Bijvoorbeeld: "Bas is Bas Spenkelink" of "voeg toe dat Wouter aansluit in sprint 3".',
    },
  ]);
  const [thinking, setThinking] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  async function handleSend() {
    const text = input.trim();
    if (!text || thinking) return;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setThinking(true);

    // Fake "AI is thinking" delay
    await new Promise((r) => setTimeout(r, MOCK_THINK_MS));

    const proposal = pickMockProposal(text);
    setMessages((m) => [...m, { role: "assistant", content: proposal.intro, proposal }]);
    setThinking(false);
  }

  function handleApply(messageIndex: number) {
    setMessages((m) => {
      const next = [...m];
      // Remove the proposal so the action buttons disappear
      const msg = next[messageIndex];
      if (msg.role === "assistant" && msg.proposal) {
        next[messageIndex] = { role: "assistant", content: msg.content };
      }
      next.push({
        role: "system",
        content: "✓ Toegepast. Nieuwe summary en briefing zijn opgeslagen.",
      });
      return next;
    });
    setAppliedCount((n) => n + 1);
  }

  function handleReject(messageIndex: number) {
    setMessages((m) => {
      const next = [...m];
      const msg = next[messageIndex];
      if (msg.role === "assistant" && msg.proposal) {
        next[messageIndex] = { role: "assistant", content: msg.content };
      }
      next.push({
        role: "system",
        content: "✗ Verworpen. Zeg wat er anders moet, of begin opnieuw met een nieuwe instructie.",
      });
      return next;
    });
  }

  function handleUndo() {
    if (appliedCount === 0) return;
    setAppliedCount((n) => Math.max(0, n - 1));
    setMessages((m) => [
      ...m,
      {
        role: "system",
        content: "↶ Laatste wijziging ongedaan gemaakt (uit revision log).",
      },
    ]);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Floating action button — fixed bottom-right */}
      <SheetTrigger
        render={
          <button
            type="button"
            className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:brightness-110 active:translate-y-px"
          />
        }
      >
        <Sparkles className="size-4" />
        Bewerk met AI
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-md md:max-w-lg"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">AI Summary Editor</p>
              <p className="truncate text-xs text-muted-foreground">{meetingTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {appliedCount > 0 && (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={handleUndo}
                title="Laatste wijziging ongedaan maken"
              >
                <Undo2 className="size-4" />
              </Button>
            )}
            <Button size="icon-sm" variant="ghost" onClick={() => setOpen(false)} title="Sluiten">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Revision log hint */}
        {appliedCount > 0 && (
          <div className="mx-4 flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
            <History className="size-3" />
            {appliedCount} wijziging{appliedCount === 1 ? "" : "en"} toegepast — zichtbaar in
            revision log
          </div>
        )}

        {/* Message list */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              onApply={() => handleApply(i)}
              onReject={() => handleReject(i)}
            />
          ))}
          {thinking && (
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Zeg wat er moet veranderen..."
              rows={2}
              disabled={thinking}
              className="w-full resize-none rounded-lg border border-border/60 bg-background px-3 py-2 pr-11 text-sm outline-none ring-ring/50 transition-all placeholder:text-muted-foreground focus:border-ring focus:ring-3 disabled:opacity-50"
            />
            <Button
              size="icon-sm"
              variant="default"
              onClick={handleSend}
              disabled={thinking || !input.trim()}
              className="absolute bottom-2 right-2"
            >
              <Send className="size-3.5" />
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            Enter verstuurt · Shift+Enter = nieuwe regel
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface MessageBubbleProps {
  message: Message;
  onApply: () => void;
  onReject: () => void;
}

function MessageBubble({ message, onApply, onReject }: MessageBubbleProps) {
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

  // assistant
  return (
    <div className="space-y-2">
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
                <Button size="sm" variant="default" onClick={onApply}>
                  <Check className="size-3.5" data-icon="inline-start" />
                  Toepassen
                </Button>
                <Button size="sm" variant="outline" onClick={onReject}>
                  <X className="size-3.5" data-icon="inline-start" />
                  Verwerpen
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={onReject}
                >
                  Anders voorstellen
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
