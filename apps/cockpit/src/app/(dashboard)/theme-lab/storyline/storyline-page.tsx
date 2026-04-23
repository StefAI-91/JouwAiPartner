"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  HelpCircle,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ExtractionType, MomentKind, ThemeStoryline } from "./storyline-data";
import { HIRING_STORY } from "./storyline-data";

/* ─── Helpers ─────────────────────────────────────────────── */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const hours = Math.round((now - then) / 3_600_000);
  if (hours < 1) return "net";
  if (hours < 24) return `${hours}u geleden`;
  const days = Math.round(hours / 24);
  if (days === 1) return "gisteren";
  return `${days} dagen geleden`;
}

function extractionStyle(type: ExtractionType) {
  switch (type) {
    case "decision":
      return {
        Icon: CheckCircle2,
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        ring: "ring-emerald-200",
        label: "Besluit",
      };
    case "action_item":
      return {
        Icon: Target,
        color: "text-sky-700",
        bg: "bg-sky-50",
        ring: "ring-sky-200",
        label: "Vervolg",
      };
    case "need":
      return {
        Icon: HelpCircle,
        color: "text-amber-700",
        bg: "bg-amber-50",
        ring: "ring-amber-200",
        label: "Need",
      };
    case "insight":
      return {
        Icon: Lightbulb,
        color: "text-violet-700",
        bg: "bg-violet-50",
        ring: "ring-violet-200",
        label: "Inzicht",
      };
  }
}

function momentStyle(kind: MomentKind) {
  switch (kind) {
    case "decision":
      return { color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" };
    case "shift":
      return { color: "text-sky-700", bg: "bg-sky-50", ring: "ring-sky-200" };
    case "tension":
      return { color: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200" };
    case "open":
      return { color: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-200" };
  }
}

/* ─── Main ─────────────────────────────────────────────── */

export function StorylinePage() {
  const story = HIRING_STORY;

  return (
    <div className="relative mx-auto max-w-[1120px] px-6 py-10 lg:px-10">
      <PrototypeBanner />
      <BackLink />
      <Header story={story} />
      <Narrative story={story} />
      <MomentsRail story={story} />
      <DetailTabs story={story} />
      <BottomNote />
    </div>
  );
}

/* ─── Prototype banner (voor theme-lab context) ─────────── */

function PrototypeBanner() {
  return (
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
      <FlaskConical className="h-3 w-3" />
      Prototype · theme detail page v2
    </div>
  );
}

function BackLink() {
  return (
    <a
      href="/theme-lab"
      className="mb-8 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Terug naar theme-lab overzicht
    </a>
  );
}

/* ─── Header ─────────────────────────────────────────────── */

function Header({ story }: { story: ThemeStoryline }) {
  const s = story.stats;
  return (
    <div className="mb-8">
      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card text-[36px]">
          {story.emoji}
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-[36px] font-bold leading-[1.05] tracking-tight text-foreground">
            {story.name}
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">{story.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
            <Stat label="Meetings" value={s.meetings} />
            <Dot />
            <Stat label="Extractions" value={s.extractions} />
            <Dot />
            <Stat label="Besluiten" value={s.decisions} />
            <Dot />
            <Stat
              label="Open vragen"
              value={s.openQuestions}
              accent={s.openQuestions > 0 ? "amber" : undefined}
            />
            <Dot />
            <span>Laatst besproken {s.lastMentionedDays}d geleden</span>
          </div>
        </div>
        <button className="hidden shrink-0 rounded-lg border border-border/60 bg-card px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground lg:block">
          Bewerken
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "amber" }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className={`font-heading text-[15px] font-semibold ${
          accent === "amber" ? "text-amber-700" : "text-foreground"
        }`}
      >
        {value}
      </span>
      <span>{label}</span>
    </span>
  );
}

function Dot() {
  return <span className="text-muted-foreground/40">·</span>;
}

/* ─── AI Narrative ───────────────────────────────────────── */

function Narrative({ story }: { story: ThemeStoryline }) {
  const paragraphs = story.narrative.body.split("\n\n");
  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card">
      <div className="flex items-center justify-between gap-4 border-b border-primary/15 px-5 py-3">
        <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />
          AI-verhaal · {relativeTime(story.narrative.generatedAt)}
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <RefreshCw className="h-3 w-3" />
            Ververs verhaal
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-[12px] font-medium text-primary">
          <TrendingUp className="h-3.5 w-3.5" />
          {story.narrative.currentStatus}
        </div>
        <div className="space-y-3.5 text-[14px] leading-[1.7] text-foreground/90">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/40 pt-4 text-[11px] text-muted-foreground">
          <span className="font-mono">
            {story.narrative.model} · gebaseerd op {story.stats.meetings} meetings ·{" "}
            {story.stats.extractions} extracties
          </span>
          <div className="flex items-center gap-1.5">
            <button className="rounded-md border border-border/60 bg-card px-2 py-0.5 hover:bg-accent">
              👍 Klopt
            </button>
            <button className="rounded-md border border-border/60 bg-card px-2 py-0.5 hover:bg-accent">
              Herschrijf
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Moments rail ───────────────────────────────────────── */

function MomentsRail({ story }: { story: ThemeStoryline }) {
  const sorted = [...story.moments].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        Sleutelmomenten
        <span className="ml-1 rounded bg-muted/70 px-1.5 py-0.5 text-muted-foreground/80">
          {sorted.length}
        </span>
      </div>
      <div className="relative rounded-2xl border border-border/60 bg-card px-5 py-5">
        <div className="absolute left-5 right-5 top-1/2 -translate-y-1/2 border-t border-dashed border-border/70" />
        <ol className="relative grid gap-4 md:grid-cols-4">
          {sorted.map((m) => {
            const s = momentStyle(m.kind);
            return (
              <li key={m.date} className="relative">
                <div className="flex flex-col items-start gap-2">
                  <div
                    className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 font-mono text-[10px] font-semibold ring-1 ring-inset ${s.bg} ${s.color} ${s.ring}`}
                  >
                    {formatDate(m.date)}
                  </div>
                  <div className="text-[13px] leading-snug text-foreground">{m.label}</div>
                  <a
                    href="#"
                    className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 hover:text-foreground"
                  >
                    {m.meetingIds.length === 1 ? "→ meeting" : `→ ${m.meetingIds.length} meetings`}
                  </a>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ─── Tabs ───────────────────────────────────────────────── */

type TabKey = "overview" | "meetings" | "decisions" | "people";

function DetailTabs({ story }: { story: ThemeStoryline }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "overview", label: "Verhaal per meeting", count: story.meetings.length },
    { key: "meetings", label: "Meetings", count: story.meetings.length },
    { key: "decisions", label: "Besluiten", count: story.stats.decisions },
    {
      key: "people",
      label: "Mensen",
      count: story.meetings.flatMap((m) => m.participants).filter((v, i, a) => a.indexOf(v) === i)
        .length,
    },
  ];
  return (
    <section>
      <div className="mb-5 flex gap-1 border-b border-border/60">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${
              tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                  tab === t.key ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {t.count}
              </span>
            )}
            {tab === t.key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab story={story} />}
      {tab === "meetings" && <MeetingsTab story={story} />}
      {tab === "decisions" && <DecisionsTab story={story} />}
      {tab === "people" && <PeopleTab story={story} />}
    </section>
  );
}

/* ─── Overview tab: per-meeting extractions timeline ────── */

const DEFAULT_EXPANDED = 3;

function OverviewTab({ story }: { story: ThemeStoryline }) {
  const sorted = [...story.meetings].sort((a, b) => b.date.localeCompare(a.date));
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? sorted : sorted.slice(0, DEFAULT_EXPANDED);
  const hiddenCount = sorted.length - visible.length;

  return (
    <div className="space-y-4">
      {visible.map((m) => (
        <MeetingCard key={m.meetingId} meeting={m} />
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-card/40 py-3 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Toon {hiddenCount} oudere meeting{hiddenCount === 1 ? "" : "s"}
        </button>
      )}
      {showAll && sorted.length > DEFAULT_EXPANDED && (
        <button
          onClick={() => setShowAll(false)}
          className="flex w-full items-center justify-center gap-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          Minder tonen
        </button>
      )}
    </div>
  );
}

function MeetingCard({ meeting }: { meeting: ThemeStoryline["meetings"][number] }) {
  const [open, setOpen] = useState(true);
  const decisions = meeting.extractions.filter((e) => e.type === "decision");
  const others = meeting.extractions.filter((e) => e.type !== "decision");
  return (
    <article className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <header className="flex items-center justify-between gap-4 border-b border-border/40 bg-muted/20 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-card px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground ring-1 ring-inset ring-border/60">
            {formatDate(meeting.date)}
          </div>
          <h3 className="text-[14px] font-semibold text-foreground">{meeting.title}</h3>
          <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground md:flex">
            <Users className="h-3 w-3" />
            {meeting.participants.join(", ")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={meeting.confidence} />
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={open ? "Inklappen" : "Uitklappen"}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {open && (
        <div className="space-y-4 p-5">
          <blockquote className="border-l-2 border-primary/40 bg-primary/5 px-4 py-2.5 text-[13px] italic text-foreground/85">
            &ldquo;{meeting.evidenceQuote}&rdquo;
          </blockquote>

          {decisions.length > 0 && <ExtractionGroup title="Besluiten" items={decisions} />}
          {others.length > 0 && <ExtractionGroup title="Overig besproken" items={others} />}
          {meeting.extractions.length === 0 && (
            <p className="text-[12px] italic text-muted-foreground">
              Geen gekoppelde extractions — match draagt alleen op meeting-niveau.
            </p>
          )}

          <div className="flex items-center justify-end border-t border-border/40 pt-3">
            <a
              href={`/meetings/${meeting.meetingId}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Open volledige meeting
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </article>
  );
}

function ExtractionGroup({
  title,
  items,
}: {
  title: string;
  items: ThemeStoryline["meetings"][number]["extractions"];
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {title} · {items.length}
      </div>
      <ul className="space-y-1.5">
        {items.map((e) => {
          const s = extractionStyle(e.type);
          return (
            <li
              key={e.id}
              className="flex items-start gap-3 rounded-lg border border-border/50 bg-card px-3 py-2"
            >
              <span
                className={`mt-0.5 inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] font-semibold ring-1 ring-inset ${s.bg} ${s.color} ${s.ring}`}
              >
                <s.Icon className="h-3 w-3" />
                {s.label}
              </span>
              <span className="flex-1 text-[13px] leading-relaxed text-foreground">
                {e.content}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "medium" | "high" }) {
  const styles =
    confidence === "high"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-slate-50 text-slate-600 ring-slate-200";
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ring-1 ring-inset ${styles}`}
    >
      {confidence}
    </span>
  );
}

/* ─── Simpele placeholder-tabs ───────────────────────────── */

function MeetingsTab({ story }: { story: ThemeStoryline }) {
  const sorted = [...story.meetings].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-2">
      {sorted.map((m) => (
        <a
          key={m.meetingId}
          href={`/meetings/${m.meetingId}`}
          className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 hover:bg-accent"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-muted-foreground">
              {formatDate(m.date)}
            </span>
            <span className="text-[13px] font-medium text-foreground">{m.title}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{m.extractions.length} extracties</span>
            <ConfidenceBadge confidence={m.confidence} />
          </div>
        </a>
      ))}
    </div>
  );
}

function DecisionsTab({ story }: { story: ThemeStoryline }) {
  const decisions = story.meetings.flatMap((m) =>
    m.extractions.filter((e) => e.type === "decision").map((e) => ({ ...e, meeting: m })),
  );
  return (
    <div className="space-y-2">
      {decisions.map((d) => {
        const s = extractionStyle("decision");
        return (
          <div
            key={d.id}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4"
          >
            <span
              className={`mt-0.5 inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-semibold ring-1 ring-inset ${s.bg} ${s.color} ${s.ring}`}
            >
              <s.Icon className="h-3.5 w-3.5" />
              Besluit
            </span>
            <div className="flex-1">
              <div className="text-[13.5px] text-foreground">{d.content}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {d.meeting.title} · {formatDate(d.meeting.date)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PeopleTab({ story }: { story: ThemeStoryline }) {
  const counts = new Map<string, number>();
  for (const m of story.meetings) {
    for (const p of m.participants) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const rows = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-2">
      {rows.map(([name, count]) => (
        <div
          key={name}
          className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
        >
          <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
              {name[0]}
            </div>
            {name}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {count} meeting{count === 1 ? "" : "s"}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Bottom note ───────────────────────────────────────── */

function BottomNote() {
  return (
    <div className="mt-16 rounded-2xl border border-dashed border-border/60 bg-card/40 p-5 text-[12px] leading-relaxed text-muted-foreground">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
        Prototype-notitie
      </div>
      <p>
        Dit is een schets van hoe de theme detail page er straks uitziet als we (a) de{" "}
        <code className="rounded bg-muted px-1 py-0.5">extraction_themes</code> junction bouwen en
        (b) de <code className="rounded bg-muted px-1 py-0.5">ThemeNarrator</code> agent toevoegen.
        Alle data hier is gemockt — het verhaal bovenaan is handgeschreven zoals Sonnet het ongeveer
        zou produceren. De moments-rail is geclusterd uit de meeting-datums.
      </p>
    </div>
  );
}
