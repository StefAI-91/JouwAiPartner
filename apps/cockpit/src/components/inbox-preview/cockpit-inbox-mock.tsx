import { Sparkles, Plus, Filter, Inbox, Send, ChevronRight } from "lucide-react";
import { COCKPIT_SECTIONS, type CockpitItem } from "./mock-data";

/**
 * Cockpit-inbox mock — visualiseert de team-zijde van CC-001 (PM-review-gate)
 * en CC-006 (vrije compose). CC-004 (AI-draft) is gedeferred — niet getoond.
 */
export function CockpitInboxMock() {
  return (
    <div className="flex h-[860px] flex-col overflow-hidden">
      <PageHeader />
      <OnboardingStrip />
      <div className="flex-1 overflow-y-auto px-8 pt-2 pb-10">
        {COCKPIT_SECTIONS.map((section) => (
          <Section key={section.key} label={section.label} count={section.items.length}>
            <div className="space-y-3">
              {section.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-border/40 px-8 pt-8 pb-5">
      <div>
        <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] text-muted-foreground/80 uppercase">
          <Inbox className="h-3 w-3" /> <span>Cockpit · alle projecten</span>
        </div>
        <h1 className="font-serif-display mt-1 text-4xl leading-none tracking-tight text-foreground">
          Inbox
          <span className="ml-2 align-top text-base font-sans text-muted-foreground/60">5</span>
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-3 py-1.5 text-[12px] text-muted-foreground transition hover:bg-muted">
          <Filter className="h-3.5 w-3.5" />
          Project · alle
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground shadow-sm shadow-primary/30 transition hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" />
          Nieuw bericht
        </button>
      </div>
    </header>
  );
}

function OnboardingStrip() {
  return (
    <div className="mx-8 mt-5 mb-2 overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.45_0.12_175)]/[0.06] via-transparent to-primary/[0.04] ring-1 ring-foreground/[0.06]">
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[oklch(0.45_0.12_175)]/15 text-[oklch(0.45_0.12_175)]">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1">
          <p className="text-[13px] font-medium text-foreground">Welkom in je cockpit-inbox</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            Klant-feedback wacht op jouw endorsement vóór het in de DevHub-backlog landt. Vragen kun
            je hier direct beantwoorden namens het team.
          </p>
        </div>
        <button className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted">
          Begrepen, dank
        </button>
      </div>
    </div>
  );
}

function Section({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-2.5 flex items-baseline gap-3 px-1">
        <h2 className="text-[11px] font-semibold tracking-[0.18em] text-foreground/70 uppercase">
          {label}
        </h2>
        <span className="text-[11px] text-muted-foreground/60 tabular-nums">{count}</span>
        <span aria-hidden className="ml-1 h-px flex-1 bg-border/60" />
      </div>
      {children}
    </section>
  );
}

function ItemCard({ item }: { item: CockpitItem }) {
  return (
    <article className="group/card relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.06] transition hover:ring-foreground/[0.12]">
      <div className="flex gap-4 px-4 py-3.5">
        <SenderAvatar sender={item.sender} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-medium text-foreground">{item.sender.name}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-muted-foreground">{item.project.client}</span>
            <SourceBadgePill kind={item.sourceBadge} />
            <span className="ml-auto tabular-nums text-muted-foreground/60">{item.createdAt}</span>
          </div>
          {item.title ? <p className="text-sm font-medium text-foreground">{item.title}</p> : null}
          <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
            {item.body}
          </p>

          {item.thread ? <ThreadPreview thread={item.thread} /> : null}

          {item.status === "needs_pm_review" ? <PmReviewActions /> : null}
          {item.status === "open_question" ? <ReplyComposer /> : null}
          {item.status === "deferred" ? <DeferredHint /> : null}
        </div>
      </div>
    </article>
  );
}

function SenderAvatar({ sender }: { sender: { initial: string; role: "team" | "client" } }) {
  const ring =
    sender.role === "team"
      ? "bg-primary/10 text-primary ring-primary/20"
      : "bg-[oklch(0.55_0.12_280)]/10 text-[oklch(0.55_0.12_280)] ring-[oklch(0.55_0.12_280)]/20";
  return (
    <span
      className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-medium text-[13px] ring-1 ${ring}`}
    >
      {sender.initial}
    </span>
  );
}

function SourceBadgePill({ kind }: { kind: "client_pm" | "end_user" | null }) {
  if (!kind) return null;
  if (kind === "client_pm") {
    return (
      <span className="inline-flex h-5 items-center rounded-full bg-[oklch(0.55_0.12_280)]/[0.08] px-2 text-[10px] font-medium text-[oklch(0.45_0.12_280)] ring-1 ring-inset ring-[oklch(0.55_0.12_280)]/20">
        Klant-PM
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-warning/[0.12] px-2 text-[10px] font-medium text-warning-foreground ring-1 ring-inset ring-warning/30">
      Eindgebruiker
    </span>
  );
}

function PmReviewActions() {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 -ml-1">
      <ActionButton tone="primary">Endorse</ActionButton>
      <ActionButton tone="destructive">Decline</ActionButton>
      <ActionButton tone="muted">Defer</ActionButton>
      <ActionButton tone="muted">Convert naar vraag</ActionButton>
    </div>
  );
}

function ActionButton({
  tone,
  children,
}: {
  tone: "primary" | "destructive" | "muted";
  children: React.ReactNode;
}) {
  const cls =
    tone === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/30"
      : tone === "destructive"
        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
        : "bg-muted text-foreground/80 hover:bg-accent";
  return (
    <button
      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition active:translate-y-px ${cls}`}
    >
      {children}
    </button>
  );
}

function ReplyComposer() {
  return (
    <div className="mt-2 overflow-hidden rounded-md ring-1 ring-foreground/[0.08]">
      <div className="bg-muted/30 px-3 py-2">
        <p className="text-[12px] text-muted-foreground/80">
          Antwoord namens team — Marieke ziet je naam in het portal.
        </p>
      </div>
      <div className="flex items-center gap-2 border-t border-border/50 bg-background px-3 py-2">
        <span className="flex-1 text-[12px] text-muted-foreground/60">Schrijf je antwoord…</span>
        <button className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:bg-primary/90">
          <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function ThreadPreview({
  thread,
}: {
  thread: { author: string; role: "team" | "client"; body: string; createdAt: string }[];
}) {
  return (
    <div className="mt-2 space-y-1.5 border-l-2 border-border/60 pl-3">
      {thread.map((msg, i) => (
        <div key={i} className="flex items-baseline gap-2">
          <span
            className={`text-[11px] font-medium ${msg.role === "team" ? "text-primary" : "text-foreground/80"}`}
          >
            {msg.author.split(" ")[0]}
          </span>
          <span className="text-[11px] text-muted-foreground line-clamp-1 flex-1">{msg.body}</span>
          <span className="text-[10px] tabular-nums text-muted-foreground/50">{msg.createdAt}</span>
        </div>
      ))}
    </div>
  );
}

function DeferredHint() {
  return (
    <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
      <span className="h-1.5 w-1.5 rounded-full bg-warning/70" />
      Geparkeerd — kan terug naar review
      <ChevronRight className="h-3 w-3" />
    </p>
  );
}
