import { ArrowLeft, Send } from "lucide-react";
import { CONVERSATION_FIXTURE, type ConversationMessage } from "./mock-data";

/**
 * Conversation-detail vanuit klant-perspectief: geen actie-bar, alleen
 * thread + reply. Klant ziet zichzelf rechts (jij), team links (anderen) —
 * iMessage-conventie.
 */
export function ConversationPortal() {
  const { messages } = CONVERSATION_FIXTURE;

  return (
    <div className="flex h-[680px] flex-col overflow-hidden bg-[oklch(0.985_0.005_75)]">
      <DetailHeader />
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <DateDivider label="Gisteren" />
        {/* Vanuit klant-Tom-perspectief: team is links, hij is rechts */}
        <Bubble msg={messages[0]} alignment="left" />
        <DateDivider label="Vandaag" />
        <Bubble msg={messages[1]} alignment="right" />
        <Bubble msg={messages[2]} alignment="left" />
      </div>
      <ReplyDock />
    </div>
  );
}

function DetailHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border/40 bg-background px-6 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-foreground">
            Drie kandidaten voor Q1 CRM
          </p>
          <p className="text-[11px] text-muted-foreground">
            Zonnehof CRM · met Stef Aerts (Jouw AI Partner)
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/[0.10] px-2 py-0.5 text-[10px] font-medium text-success-foreground ring-1 ring-success/25">
        <span className="h-1 w-1 rounded-full bg-success" />
        Beantwoord
      </span>
    </header>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="relative my-4 flex items-center justify-center">
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
      <span className="relative bg-[oklch(0.985_0.005_75)] px-3 text-[10px] tracking-[0.16em] text-muted-foreground/70 uppercase">
        {label}
      </span>
    </div>
  );
}

function Bubble({ msg, alignment }: { msg: ConversationMessage; alignment: "left" | "right" }) {
  const isRight = alignment === "right";
  const isTeam = msg.author.role === "team";

  return (
    <div className={`mb-3 flex gap-2.5 ${isRight ? "flex-row-reverse" : "flex-row"}`}>
      <span
        className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ring-1 ${
          isTeam
            ? "bg-primary/10 text-primary ring-primary/20"
            : "bg-foreground/[0.04] text-foreground/70 ring-foreground/[0.10]"
        }`}
      >
        {msg.author.initial}
      </span>

      <div className={`flex max-w-[80%] flex-col ${isRight ? "items-end" : "items-start"}`}>
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-medium text-foreground">
            {isRight ? "Jij" : msg.author.name.split(" ")[0]}
          </span>
          {isTeam ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 text-[9px] font-medium text-primary">
              Team
            </span>
          ) : null}
          <span className="text-[10px] tabular-nums text-muted-foreground/60">{msg.timestamp}</span>
        </div>
        <div
          className={`mt-1 rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ring-1 ${
            isRight
              ? "rounded-tr-md bg-foreground text-background ring-foreground/20"
              : "rounded-tl-md bg-background text-foreground ring-foreground/[0.08]"
          }`}
        >
          {msg.body}
        </div>
      </div>
    </div>
  );
}

function ReplyDock() {
  return (
    <div className="border-t border-border/40 bg-background px-6 py-3">
      <div className="flex items-end gap-2 rounded-xl bg-muted/40 px-3 py-2 ring-1 ring-foreground/[0.06] focus-within:ring-foreground/[0.18]">
        <span className="flex-1 py-1 text-[12.5px] text-muted-foreground/60">
          Antwoord schrijven…
        </span>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[11.5px] font-medium text-background transition hover:bg-foreground/90">
          Verstuur
          <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
