import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  Clock,
  Filter,
  Inbox,
  LogOut,
  Menu,
  PenLine,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Inbox redesign — preview",
};

/**
 * Mock-pagina voor de inbox-herontwerp. Geen auth, geen DB — pure presentatie.
 * Gebruikt dezelfde portal-tokens en fonts als productie zodat hij 1:1
 * vergelijkbaar is met de huidige inbox-screenshot.
 *
 * Beoogde routes:
 *   /preview/inbox-redesign        — desktop + mobile mock + design notes
 */

type Thread = {
  id: string;
  question: string;
  reply?: { author: "team" | "you"; body: string; at: string };
  status: "awaiting-team" | "answered" | "awaiting-you";
  participants: { name: string; initials: string; tone: "team" | "you" }[];
  time: string;
  replyCount: number;
  unread?: boolean;
};

const THREADS: Thread[] = [
  {
    id: "1",
    question: "Hoi ik heb een nieuw overzicht geplaatst met wat je kunt verwachten deze sprint.",
    reply: { author: "team", body: "Heb ik gezien — top, dankjewel!", at: "4u" },
    status: "answered",
    participants: [
      { name: "Stef", initials: "ST", tone: "team" },
      { name: "Jij", initials: "MV", tone: "you" },
    ],
    time: "4u",
    replyCount: 2,
    unread: true,
  },
  {
    id: "2",
    question: "Hoi hoe zit het met feature x?",
    status: "awaiting-team",
    participants: [{ name: "Jij", initials: "MV", tone: "you" }],
    time: "4u",
    replyCount: 0,
  },
  {
    id: "3",
    question: "Hoi Stef, wat is de status van project x?",
    reply: { author: "team", body: "Loopt op schema — demo dinsdag 14:00.", at: "3u" },
    status: "answered",
    participants: [
      { name: "Stef", initials: "ST", tone: "team" },
      { name: "Jij", initials: "MV", tone: "you" },
    ],
    time: "4u",
    replyCount: 3,
  },
  {
    id: "4",
    question: "Hoi Stef, wat is de status?",
    reply: { author: "team", body: "Is geregeld!", at: "5u" },
    status: "answered",
    participants: [
      { name: "Stef", initials: "ST", tone: "team" },
      { name: "Jij", initials: "MV", tone: "you" },
    ],
    time: "6u",
    replyCount: 2,
  },
];

export default function InboxRedesignPreview() {
  return (
    <div className="min-h-screen bg-[oklch(0.985_0.005_75)] pb-24">
      <PreviewHeader />

      <div className="mx-auto max-w-7xl px-6 pt-12 md:px-12">
        <PreviewIntro />
      </div>

      <div className="mx-auto mt-12 max-w-7xl px-6 md:px-12">
        <SectionLabel>Mobiel · zoals in de screenshot</SectionLabel>
        <div className="mt-6 grid gap-12 md:grid-cols-[auto_1fr] md:items-start">
          <PhoneFrame>
            <MobileInbox />
          </PhoneFrame>

          <DesignNotes />
        </div>
      </div>

      <div className="mx-auto mt-24 max-w-7xl px-6 md:px-12">
        <SectionLabel>Desktop · two-pane</SectionLabel>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
          <DesktopInbox />
        </div>
      </div>

      <div className="mx-auto mt-24 max-w-7xl px-6 md:px-12">
        <SectionLabel>Hiërarchie · waarom dit beter werkt</SectionLabel>
        <HierarchyComparison />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Preview chrome
   ──────────────────────────────────────────────────────────────── */

function PreviewHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Inbox className="size-4" strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Portal · design preview
            </p>
            <p className="font-heading text-[15px] font-semibold tracking-tight">
              Inbox — herontwerp v1
            </p>
          </div>
        </div>
        <span className="hidden rounded-full border border-border/60 bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground md:inline-flex">
          Mock · niet verbonden met data
        </span>
      </div>
    </header>
  );
}

function PreviewIntro() {
  return (
    <div className="max-w-2xl">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary">
        <Sparkles className="size-3" />
        Voorstel
      </div>
      <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight md:text-4xl">
        Een inbox die laat zien <em className="not-italic text-primary">wat er nieuw is</em>, niet
        wie wat zei.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        De huidige inbox toont elke rij als losse &ldquo;Jij&rdquo;-regel met een mini reactie
        eronder. Drie problemen: het zwaartepunt valt op de afzender (terwijl je altijd al weet dat
        het van jou komt), antwoorden zijn visueel even stil als wachtende vragen, en de
        &ldquo;Beantwoord&rdquo;-pil is prominenter dan het antwoord zelf. Dit voorstel keert dat
        om.
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-10 bg-border" />
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Phone frame
   ──────────────────────────────────────────────────────────────── */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto md:mx-0">
      <div className="relative w-[380px] rounded-[2.5rem] border border-border/60 bg-card p-2 shadow-soft-md">
        <div className="absolute left-1/2 top-3 z-20 h-5 w-28 -translate-x-1/2 rounded-full bg-foreground/90" />
        <div className="overflow-hidden rounded-[2rem] bg-[oklch(0.985_0.005_75)]">
          <div className="h-7" />
          {children}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Mobile inbox — the redesign
   ──────────────────────────────────────────────────────────────── */

function MobileInbox() {
  return (
    <div className="flex h-[760px] flex-col">
      {/* App header — keeps the menu / inbox / logout chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <button className="grid size-9 place-items-center rounded-lg border border-border/60 bg-card transition hover:bg-muted">
          <Menu className="size-4" strokeWidth={2} />
        </button>
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Inbox
        </p>
        <button className="grid size-9 place-items-center rounded-lg border border-border/60 bg-card transition hover:bg-muted">
          <LogOut className="size-4" strokeWidth={2} />
        </button>
      </div>

      {/* Project context + h1 — single, clear hierarchy */}
      <div className="px-5 pb-3 pt-5">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Test BV · Test project
        </p>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-[26px] font-bold leading-none tracking-tight">
            Berichten
          </h2>
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
            4 gesprekken
          </span>
        </div>
      </div>

      {/* Filter tabs — gives users a way to focus on what's pending */}
      <div className="flex items-center gap-1.5 px-5 pb-3">
        <FilterTab active count={4}>
          Alles
        </FilterTab>
        <FilterTab count={1} accent="amber">
          Wacht op team
        </FilterTab>
        <FilterTab count={3}>Beantwoord</FilterTab>
      </div>

      {/* Compose — promoted, owns its space */}
      <div className="px-5">
        <button className="group flex w-full items-center justify-between gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-soft-sm transition hover:brightness-110">
          <span className="flex items-center gap-2.5">
            <span className="grid size-6 place-items-center rounded-md bg-white/15">
              <PenLine className="size-3.5" strokeWidth={2.25} />
            </span>
            <span className="text-[13.5px] font-semibold">Nieuw bericht aan team</span>
          </span>
          <ArrowUpRight className="size-4 opacity-70 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {/* Date divider — gives rhythm + temporal grouping */}
      <DateDivider label="Vandaag" />

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-6">
        {THREADS.slice(0, 3).map((t) => (
          <ThreadCard key={t.id} thread={t} />
        ))}

        <DateDivider label="Gisteren" inline />
        {THREADS.slice(3).map((t) => (
          <ThreadCard key={t.id} thread={t} />
        ))}
      </div>
    </div>
  );
}

function FilterTab({
  children,
  count,
  active,
  accent,
}: {
  children: React.ReactNode;
  count: number;
  active?: boolean;
  accent?: "amber";
}) {
  return (
    <button
      className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${
        active
          ? "bg-foreground text-background"
          : "border border-border/60 bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      <span>{children}</span>
      <span
        className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9.5px] font-bold tabular-nums ${
          active
            ? "bg-background/20 text-background"
            : accent === "amber"
              ? "bg-amber-500/15 text-amber-700"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function DateDivider({ label, inline }: { label: string; inline?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-5 ${inline ? "pt-4" : "pb-2 pt-5"}`}>
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
        {label}
      </span>
      <span className="h-px flex-1 bg-border/60" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Thread card — the core unit
   ──────────────────────────────────────────────────────────────── */

function ThreadCard({ thread }: { thread: Thread }) {
  const isAwaitingTeam = thread.status === "awaiting-team";
  const isAnswered = thread.status === "answered";
  const showTeamAvatar = isAnswered && thread.reply?.author === "team";

  return (
    <Link
      href="#"
      className={`group block rounded-xl border bg-card px-4 py-3.5 transition hover:shadow-soft-sm ${
        isAwaitingTeam
          ? "border-amber-300/70 bg-amber-50/40"
          : thread.unread
            ? "border-primary/30 ring-1 ring-primary/10"
            : "border-border/60"
      }`}
    >
      {/* Top row: status pill + time */}
      <div className="flex items-center gap-2">
        {isAwaitingTeam ? (
          <StatusPill tone="amber" icon={<Clock className="size-3" strokeWidth={2.25} />}>
            Wacht op antwoord
          </StatusPill>
        ) : (
          <StatusPill tone="success" icon={<CheckCheck className="size-3" strokeWidth={2.25} />}>
            Beantwoord · {thread.reply?.at} geleden
          </StatusPill>
        )}

        <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] tabular-nums text-muted-foreground/80">
          {thread.replyCount > 0 && (
            <>
              <span className="font-semibold">{thread.replyCount}</span>
              <span>reacties</span>
              <span className="mx-1 size-1 rounded-full bg-muted-foreground/40" />
            </>
          )}
          {thread.time}
        </span>
      </div>

      {/* Main content — emphasis flips per state */}
      {isAnswered && thread.reply ? (
        <div className="mt-3 space-y-2.5">
          {/* Your question — quoted small, sets context */}
          <div className="flex items-start gap-2">
            <span className="mt-1 h-3 w-0.5 rounded-full bg-border" />
            <p className="line-clamp-1 text-[12px] leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground/70">Jij vroeg:</span> {thread.question}
            </p>
          </div>

          {/* Team's reply — promoted, this is what's NEW */}
          <div className="flex items-start gap-2.5">
            {showTeamAvatar && <Avatar tone="team" initials="ST" />}
            <div className="flex-1 leading-snug">
              <p className="line-clamp-2 text-[14px] font-medium text-foreground">
                &ldquo;{thread.reply.body}&rdquo;
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Stef · team Jouw AI Partner</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {/* Your unanswered question — full prominence */}
          <p className="line-clamp-2 text-[14px] font-medium text-foreground">{thread.question}</p>
          <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <Avatar tone="team" initials="ST" size="sm" />
            <span>
              Stef leest dit normaal binnen <strong className="font-semibold">een paar uur</strong>.
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────
   Atoms
   ──────────────────────────────────────────────────────────────── */

function StatusPill({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: "amber" | "success" | "muted";
  icon?: React.ReactNode;
}) {
  const styles = {
    amber: "bg-amber-100/80 text-amber-800 border-amber-200/80",
    success: "bg-emerald-50 text-emerald-800 border-emerald-100",
    muted: "bg-muted text-muted-foreground border-border/60",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${styles[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

function Avatar({
  initials,
  tone,
  size = "md",
}: {
  initials: string;
  tone: "team" | "you";
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "size-5 text-[9.5px]" : "size-7 text-[11px]";
  const palette =
    tone === "team" ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-foreground/80";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold ${dim} ${palette}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   Design notes
   ──────────────────────────────────────────────────────────────── */

function DesignNotes() {
  const notes = [
    {
      title: "Eén identiteit per project, niet vier",
      body: "Het kruimelpad ‘TEST BV · TEST PROJECT · Berichten’ wordt nu één regel kapitaal-tracking + grote ‘Berichten’ titel. Eronder direct hoeveel gesprekken er lopen.",
    },
    {
      title: "Status komt eerst, niet de afzender",
      body: "Elke kaart opent met een statuspil (Wacht op antwoord / Beantwoord) — dat is wat je komt checken. ‘Jij’ herhalen heeft geen informatiewaarde; je weet dat het van jou is.",
    },
    {
      title: "Het antwoord wint",
      body: "Bij beantwoorde threads wordt het antwoord van het team groot en in quotes getoond, met avatar van de afzender. Jouw oorspronkelijke vraag staat klein erboven als context.",
    },
    {
      title: "Wachtende vragen krijgen ruimte",
      body: "Open vragen krijgen een warme amber-rand + subtiele tint zodat je in één oogopslag ziet wat nog actie nodig heeft. Geen alarmrood — het is geen probleem, het is een wachtstand.",
    },
    {
      title: "Filter-tabs i.p.v. eindeloos scrollen",
      body: "Drie tabs (Alles · Wacht op team · Beantwoord) met counts. Gebruikers met veel threads kunnen direct naar wat ertoe doet.",
    },
    {
      title: "Tijd-grouping geeft ritme",
      body: "Vandaag / Gisteren / Eerder — kleine divider-labels breken de monotonie en maken duidelijk wanneer iets gebeurde, zonder dat elke rij een datum nodig heeft.",
    },
  ];

  return (
    <ol className="space-y-5">
      {notes.map((n, i) => (
        <li key={n.title} className="flex gap-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 font-heading text-[12px] font-bold tabular-nums text-primary">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="flex-1 pt-0.5">
            <h3 className="font-heading text-[15px] font-semibold tracking-tight">{n.title}</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{n.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ────────────────────────────────────────────────────────────────
   Desktop two-pane
   ──────────────────────────────────────────────────────────────── */

function DesktopInbox() {
  return (
    <div className="grid h-[640px] grid-cols-[380px_1fr] divide-x divide-border/60 bg-card">
      {/* Left pane: list */}
      <div className="flex flex-col">
        <div className="border-b border-border/60 px-5 py-5">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Test BV · Test project
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <h2 className="font-heading text-[22px] font-bold tracking-tight">Berichten</h2>
            <button className="grid size-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <Filter className="size-3.5" strokeWidth={2} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <FilterTab active count={4}>
              Alles
            </FilterTab>
            <FilterTab count={1} accent="amber">
              Wacht op team
            </FilterTab>
            <FilterTab count={3}>Beantwoord</FilterTab>
          </div>
        </div>

        <div className="px-4 py-3">
          <button className="group flex w-full items-center justify-between gap-3 rounded-xl bg-primary px-4 py-2.5 text-primary-foreground shadow-soft-sm transition hover:brightness-110">
            <span className="flex items-center gap-2.5">
              <PenLine className="size-3.5" strokeWidth={2.25} />
              <span className="text-[13px] font-semibold">Nieuw bericht aan team</span>
            </span>
            <ArrowUpRight className="size-4 opacity-70 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>

        <DateDivider label="Vandaag" />
        <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-6">
          {THREADS.slice(0, 3).map((t) => (
            <ThreadCard key={t.id} thread={t} />
          ))}
          <DateDivider label="Gisteren" inline />
          {THREADS.slice(3).map((t) => (
            <ThreadCard key={t.id} thread={t} />
          ))}
        </div>
      </div>

      {/* Right pane: open thread */}
      <div className="flex flex-col bg-[oklch(0.985_0.005_75)]">
        <div className="flex items-center justify-between border-b border-border/60 bg-card px-6 py-4">
          <div>
            <StatusPill tone="success" icon={<CheckCheck className="size-3" strokeWidth={2.25} />}>
              Beantwoord
            </StatusPill>
            <h3 className="mt-2 font-heading text-[18px] font-semibold tracking-tight">
              Nieuw overzicht voor sprint
            </h3>
            <p className="text-[11.5px] text-muted-foreground">
              Gestart 4 uur geleden · 2 deelnemers · 2 reacties
            </p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg border border-border/60 bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <ArrowUpRight className="size-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <Bubble
            tone="you"
            initials="MV"
            name="Jij"
            time="14:02"
            body="Hoi ik heb een nieuw overzicht geplaatst met wat je kunt verwachten deze sprint. Laat het weten als er iets ontbreekt."
          />
          <Bubble
            tone="team"
            initials="ST"
            name="Stef · Jouw AI Partner"
            time="14:18"
            body="Heb ik gezien — top, dankjewel! Ik plan vrijdag een korte check-in om door te lopen wat we deze sprint oppakken."
          />
          <Bubble
            tone="you"
            initials="MV"
            name="Jij"
            time="14:21"
            body="Perfect, vrijdag 10:00 staat al."
            seen
          />
        </div>

        <div className="border-t border-border/60 bg-card px-6 py-4">
          <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
            <p className="text-[13px] text-muted-foreground/70">Schrijf een antwoord aan Stef…</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/60">
                Enter ↵ verzenden
              </p>
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground transition hover:brightness-110">
                <Check className="size-3.5" strokeWidth={2.5} />
                Versturen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  tone,
  initials,
  name,
  time,
  body,
  seen,
}: {
  tone: "team" | "you";
  initials: string;
  name: string;
  time: string;
  body: string;
  seen?: boolean;
}) {
  const isYou = tone === "you";
  return (
    <div className={`flex gap-3 ${isYou ? "flex-row-reverse" : ""}`}>
      <Avatar initials={initials} tone={tone} />
      <div className={`max-w-[80%] ${isYou ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`flex items-center gap-2 text-[11px] text-muted-foreground ${
            isYou ? "flex-row-reverse" : ""
          }`}
        >
          <span className="font-semibold text-foreground/80">{name}</span>
          <span className="tabular-nums">{time}</span>
        </div>
        <div
          className={`mt-1 rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed shadow-soft-sm ${
            isYou
              ? "rounded-tr-md bg-primary text-primary-foreground"
              : "rounded-tl-md bg-card text-foreground"
          }`}
        >
          {body}
        </div>
        {seen && (
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70">
            <CheckCheck className="size-3" strokeWidth={2.25} />
            Gelezen
          </span>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Hierarchy comparison
   ──────────────────────────────────────────────────────────────── */

function HierarchyComparison() {
  const rows = [
    {
      old: "Jij",
      next: "Status (wachtend / beantwoord)",
      reason:
        "‘Jij’ is altijd waar — geen informatiewaarde. Status is per thread anders en is wat de gebruiker komt checken.",
    },
    {
      old: "Vraag-preview, één regel",
      next: "Antwoord-preview groot, vraag klein als context",
      reason:
        "Bij beantwoorde threads is het antwoord het nieuws. De oorspronkelijke vraag is geheugensteun, niet hoofdzaak.",
    },
    {
      old: "‘Beantwoord’ pil prominent",
      next: "Pil + tijd geleden geïntegreerd",
      reason:
        "Combineert twee data-punten in één compactere pil zodat het visuele gewicht klopt met het belang.",
    },
    {
      old: "Tijd rechtsboven, los",
      next: "Reactie-count + tijd, rechts uitgelijnd, tabular-nums",
      reason:
        "Cijfers lijnen verticaal uit over rijen — kalmer beeld. Bovendien zie je in één blik welk gesprek meer activiteit had.",
    },
    {
      old: "Geen filter, alles op één hoop",
      next: "Filter-tabs ‘Alles · Wacht op team · Beantwoord’",
      reason:
        "Bij groei (>10 threads) wordt scrollen vermoeiend. Tabs houden ‘wat moet er nog gebeuren’ één klik weg.",
    },
  ];

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
      <div className="grid grid-cols-12 gap-4 border-b border-border/60 bg-muted/30 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <div className="col-span-3">Nu</div>
        <div className="col-span-3">Voorstel</div>
        <div className="col-span-6">Waarom</div>
      </div>
      <ul className="divide-y divide-border/60">
        {rows.map((r) => (
          <li key={r.old} className="grid grid-cols-12 gap-4 px-6 py-4 text-[13px]">
            <div className="col-span-3 text-muted-foreground line-through decoration-muted-foreground/40">
              {r.old}
            </div>
            <div className="col-span-3 font-semibold text-foreground">{r.next}</div>
            <div className="col-span-6 text-muted-foreground">{r.reason}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
