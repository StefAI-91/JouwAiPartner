import { ArrowLeft, Send, MoreHorizontal, Paperclip } from "lucide-react";
import { CONVERSATION_FIXTURE, type ConversationMessage } from "./mock-data";

/**
 * Conversation-detail vanuit team-perspectief: action-bar bovenaan voor
 * PM-acties, chat-thread in het midden (jouw berichten rechts, anderen links —
 * iMessage-conventie), reply-form vast onderaan.
 */
export function ConversationCockpit() {
  const { threadTitle, project, messages } = CONVERSATION_FIXTURE;

  return (
    <div className="flex h-[680px] flex-col overflow-hidden">
      <DetailHeader title={threadTitle} project={project.client} />
      <ActionBar />
      <div className="flex-1 overflow-y-auto bg-muted/[0.15] px-8 py-6">
        <DateDivider label="Gisteren" />
        <Bubble msg={messages[0]} alignment="left" />
        <DateDivider label="Vandaag" />
        <Bubble msg={messages[1]} alignment="left" />
        <Bubble msg={messages[2]} alignment="right" />
      </div>
      <ReplyDock />
    </div>
  );
}

function DetailHeader({ title, project }: { title: string; project: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border/40 bg-background px-6 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">
            {project} · 3 berichten · We hebben gereageerd
          </p>
        </div>
      </div>
      <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground">
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </header>
  );
}

function ActionBar() {
  return (
    <div className="flex items-center gap-1.5 border-b border-border/40 bg-gradient-to-b from-background to-muted/20 px-6 py-2.5">
      <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground/80 uppercase">
        Acties
      </span>
      <ActionPill tone="primary">Endorse → DevHub</ActionPill>
      <ActionPill tone="destructive">Decline</ActionPill>
      <ActionPill tone="muted">Defer</ActionPill>
      <ActionPill tone="muted">Convert naar vraag</ActionPill>
      <span className="ml-auto text-[10px] text-muted-foreground/70">⌘E ⌘D ⌘P ⌘K</span>
    </div>
  );
}

function ActionPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "primary" | "destructive" | "muted";
}) {
  const cls =
    tone === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/30"
      : tone === "destructive"
        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
        : "bg-foreground/[0.04] text-foreground/80 hover:bg-foreground/[0.08]";
  return (
    <button
      className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition active:translate-y-px ${cls}`}
    >
      {children}
    </button>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="relative my-4 flex items-center justify-center">
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
      <span className="relative bg-muted/[0.15] px-3 text-[10px] tracking-[0.16em] text-muted-foreground/70 uppercase">
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
            : "bg-[oklch(0.55_0.12_280)]/10 text-[oklch(0.55_0.12_280)] ring-[oklch(0.55_0.12_280)]/20"
        }`}
      >
        {msg.author.initial}
      </span>

      <div className={`max-w-[80%] ${isRight ? "items-end" : "items-start"} flex flex-col`}>
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-medium text-foreground">
            {msg.author.name.split(" ")[0]}
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground/60">{msg.timestamp}</span>
        </div>
        <div
          className={`mt-1 rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ring-1 ${
            isRight
              ? "rounded-tr-md bg-primary text-primary-foreground ring-primary/20"
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
        <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground">
          <Paperclip className="h-3.5 w-3.5" />
        </button>
        <span className="flex-1 py-1 text-[12.5px] text-muted-foreground/60">
          Antwoord namens team — ⏎ om te verzenden
        </span>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11.5px] font-medium text-primary-foreground transition hover:bg-primary/90">
          Verstuur
          <Send className="h-3 w-3" />
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-muted-foreground/60">
        Tom Hendriks ziet je naam in het portal — antwoord komt aan via mail én portal-inbox.
      </p>
    </div>
  );
}
