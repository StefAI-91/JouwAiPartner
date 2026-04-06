"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Send,
  Bot,
  User,
  CheckCircle,
  XCircle,
  Pencil,
  ListTodo,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewMeetingDetail } from "@repo/database/queries/review";

interface ReviewChatProps {
  meeting: ReviewMeetingDetail;
}

export function ReviewChat({ meeting }: ReviewChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat/review",
      body: { meetingId: meeting.id },
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Review Assistent</h2>
            <p className="text-xs text-muted-foreground">
              {meeting.title} &middot; {meeting.date?.slice(0, 10)} &middot;{" "}
              {meeting.extractions.length} extracties
            </p>
          </div>
        </div>
      </div>

      {/* Meeting info strip */}
      <div className="border-b border-border bg-muted/30 px-6 py-3">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            <strong>Type:</strong> {meeting.meeting_type ?? "?"} ({meeting.party_type ?? "?"})
          </span>
          <span>
            <strong>Organisatie:</strong> {meeting.organization?.name ?? "Onbekend"}
          </span>
          <span>
            <strong>Deelnemers:</strong>{" "}
            {meeting.meeting_participants?.map((mp) => mp.person.name).join(", ") || "?"}
          </span>
          {meeting.meeting_projects?.length > 0 && (
            <span>
              <strong>Projecten:</strong>{" "}
              {meeting.meeting_projects.map((mp) => mp.project.name).join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Welcome message if no messages yet */}
          {messages.length === 0 && !isLoading && (
            <MessageBubble
              role="assistant"
              textContent={`Ik heb de meeting **"${meeting.title}"** geladen. ${meeting.extractions.length} extracties gevonden.\n\nZal ik ze met je doorlopen?`}
              toolParts={[]}
            />
          )}

          {messages.map((message) => (
            <MessageFromParts key={message.id} message={message} />
          ))}

          {isLoading && messages.at(-1)?.role !== "assistant" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Aan het nadenken...</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="border-t border-border bg-muted/20 px-6 py-2">
        <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto">
          <QuickAction
            label="Loop extracties door"
            onClick={() => send("Loop alle extracties met me door, een voor een.")}
          />
          <QuickAction
            label="Mis ik iets?"
            onClick={() =>
              send("Zijn er onderwerpen in het transcript die niet in de extracties staan?")
            }
          />
          <QuickAction
            label="Samenvatting"
            onClick={() => send("Geef me een korte samenvatting van deze meeting.")}
          />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-6 py-4">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Stel een vraag over de meeting of geef instructies..."
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Sub-components ──

interface ToolPartInfo {
  toolName: string;
  state: string;
  result?: { success: boolean; message: string };
}

function MessageFromParts({ message }: { message: UIMessage }) {
  const textContent = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

  const toolParts: ToolPartInfo[] = message.parts
    .filter((p) => p.type.startsWith("tool-") || p.type === "dynamic-tool")
    .map((p) => {
      const part = p as Record<string, unknown>;
      return {
        toolName: (part.toolName as string) ?? p.type.replace("tool-", ""),
        state: part.state as string,
        result: part.output as { success: boolean; message: string } | undefined,
      };
    });

  return <MessageBubble role={message.role} textContent={textContent} toolParts={toolParts} />;
}

function MessageBubble({
  role,
  textContent,
  toolParts,
}: {
  role: string;
  textContent: string;
  toolParts: ToolPartInfo[];
}) {
  const isAssistant = role === "assistant";

  return (
    <div className={cn("flex gap-3", !isAssistant && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isAssistant ? "bg-primary/10" : "bg-secondary",
        )}
      >
        {isAssistant ? (
          <Bot className="size-4 text-primary" />
        ) : (
          <User className="size-4 text-muted-foreground" />
        )}
      </div>

      <div className={cn("max-w-[80%] space-y-2", !isAssistant && "text-right")}>
        {textContent && (
          <div
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm leading-relaxed",
              isAssistant ? "bg-muted/50 text-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            <SimpleMarkdown content={textContent} />
          </div>
        )}

        {toolParts
          .filter((t) => t.state === "result" || t.state === "output-available")
          .map((t, i) => (
            <ToolResultBadge key={i} toolName={t.toolName} result={t.result} />
          ))}
      </div>
    </div>
  );
}

function ToolResultBadge({
  toolName,
  result,
}: {
  toolName: string;
  result?: { success: boolean; message: string };
}) {
  if (!result) return null;

  const icons: Record<string, React.ReactNode> = {
    approveExtraction: <CheckCircle className="size-3.5" />,
    rejectExtraction: <XCircle className="size-3.5" />,
    updateExtraction: <Pencil className="size-3.5" />,
    createTask: <ListTodo className="size-3.5" />,
    finishReview: <CheckCircle className="size-3.5" />,
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
        result.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      {icons[toolName] ?? <Bot className="size-3.5" />}
      {result.message}
    </div>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {label}
    </button>
  );
}

function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        const processed = line
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(
            /`(.+?)`/g,
            '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>',
          );

        return <p key={i} dangerouslySetInnerHTML={{ __html: processed }} />;
      })}
    </div>
  );
}
