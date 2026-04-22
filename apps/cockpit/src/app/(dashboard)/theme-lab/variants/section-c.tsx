"use client";

import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  MessageSquareQuote,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { THEMES, QUOTES, TIMELINE_EVENTS, OPEN_QUESTIONS, PEOPLE, MEETINGS } from "../mock-data";
import { VariantCard } from "../theme-lab";

export function SectionC() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <VariantC11 />
      <VariantC12 />
      <VariantC13 />
      <VariantC14 />
      <VariantC15 />
    </div>
  );
}

/* C11 — Detail page met tabs ────────────────────────────── */

function VariantC11() {
  const [tab, setTab] = useState<"overview" | "meetings" | "decisions" | "questions" | "people">(
    "overview",
  );
  const theme = THEMES[0]; // Hiring
  const tabs = [
    { key: "overview", label: "Overzicht" },
    { key: "meetings", label: "Meetings", count: 8 },
    { key: "decisions", label: "Besluiten", count: 3 },
    { key: "questions", label: "Open vragen", count: 3 },
    { key: "people", label: "Mensen", count: 3 },
  ] as const;

  return (
    <VariantCard
      id="C11"
      title="Detail page met tabs"
      subtitle="Klik op een thema → dedicated pagina met vijf perspectieven."
      tunable={["Tab-volgorde", "Default-tab", "Counts wel/niet"]}
      span={2}
    >
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="border-b border-border/60 p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{theme.emoji}</span>
            <div>
              <h4 className="font-heading text-[18px] font-semibold text-foreground">
                {theme.name}
              </h4>
              <p className="text-[12px] text-muted-foreground">{theme.description}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1 border-b border-border/60 px-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium transition-colors ${
                tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {"count" in t && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                  {t.count}
                </span>
              )}
              {tab === t.key && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
        <div className="min-h-[160px] p-5">
          {tab === "overview" && (
            <div className="space-y-3 text-[13px] text-foreground">
              <p>
                14 mentions afgelopen 30 dagen. Belangrijke verschuiving rond 14 april van
                &quot;geen nieuwe aanname&quot; naar &quot;twee junior devs werven&quot;.
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border/60 p-2">
                  <div className="font-heading text-[18px] font-semibold">8</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    meetings
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 p-2">
                  <div className="font-heading text-[18px] font-semibold">3</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    besluiten
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 p-2">
                  <div className="font-heading text-[18px] font-semibold text-amber-600">3</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    open vragen
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab === "meetings" && (
            <div className="space-y-2">
              {MEETINGS.filter((m) => m.themeIds.includes(theme.id)).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-[12px]"
                >
                  <span className="text-foreground">{m.title}</span>
                  <span className="text-muted-foreground">{m.date}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "decisions" && (
            <div className="space-y-2">
              {TIMELINE_EVENTS.filter((e) => e.kind === "decision").map((e, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border/50 p-3"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
                  <div className="flex-1 text-[12px]">
                    <div className="text-foreground">{e.text}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {e.date} · {e.source}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "questions" && (
            <div className="space-y-2">
              {OPEN_QUESTIONS.t1.map((q, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3"
                >
                  <HelpCircle className="mt-0.5 h-3.5 w-3.5 text-amber-600" />
                  <div className="flex-1 text-[12px]">
                    <div className="text-foreground">{q.question}</div>
                    <div className="mt-0.5 text-[10px] text-amber-700">
                      Al {q.daysOpen} dagen open
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "people" && (
            <div className="space-y-2">
              {PEOPLE.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-[12px]"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {p.name}
                  </span>
                  <span className="text-muted-foreground">
                    {p.id === "p1" ? "8" : p.id === "p2" ? "7" : "2"} mentions
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </VariantCard>
  );
}

/* C12 — Theme timeline ──────────────────────────────────── */

function kindStyle(kind: string) {
  switch (kind) {
    case "decision":
      return {
        icon: CheckCircle2,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        ring: "ring-emerald-200",
        label: "Besluit",
      };
    case "concern":
      return {
        icon: HelpCircle,
        color: "text-amber-600",
        bg: "bg-amber-50",
        ring: "ring-amber-200",
        label: "Zorg",
      };
    default:
      return {
        icon: Lightbulb,
        color: "text-sky-600",
        bg: "bg-sky-50",
        ring: "ring-sky-200",
        label: "Inzicht",
      };
  }
}

function VariantC12() {
  return (
    <VariantCard
      id="C12"
      title="Theme timeline"
      subtitle="Verticale chronologie van besluiten, zorgen en inzichten — met directe quotes."
      tunable={["Groepering (dag/week)", "Filter per kind", "Quote-weergave"]}
    >
      <div className="relative space-y-4 rounded-xl border border-border/60 bg-muted/10 p-5">
        <div className="absolute left-8 top-5 h-[calc(100%-40px)] w-px bg-border/60" />
        {TIMELINE_EVENTS.map((e, i) => {
          const s = kindStyle(e.kind);
          const Icon = s.icon;
          return (
            <div key={i} className="relative flex gap-4">
              <div
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-card ${s.bg}`}
              >
                <Icon className={`h-3 w-3 ${s.color}`} />
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${s.bg} ${s.color}`}
                  >
                    {s.label}
                  </span>
                  <span className="font-mono">{e.date}</span>
                  <span>·</span>
                  <span>{e.source}</span>
                </div>
                <div className="mt-1.5 text-[13px] font-medium text-foreground">{e.text}</div>
                <blockquote
                  className={`mt-2 rounded-lg border-l-2 bg-card/80 px-3 py-2 text-[12px] italic text-muted-foreground ring-1 ring-inset ${s.ring}`}
                >
                  &quot;{e.quote}&quot; <span className="not-italic">— {e.author}</span>
                </blockquote>
              </div>
            </div>
          );
        })}
      </div>
    </VariantCard>
  );
}

/* C13 — Theme narrative paragraaf ───────────────────────── */

function VariantC13() {
  return (
    <VariantCard
      id="C13"
      title="Theme narrative (AI-geschreven)"
      subtitle="Paragraafje bovenaan het thema dat vertelt waar het staat. Ververst nachtelijk."
      tunable={["Prompt", "Lengte", "Tone-of-voice"]}
    >
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />
          Narrative · bijgewerkt 6u geleden
        </div>
        <h4 className="font-heading text-[16px] font-semibold text-foreground">
          👩‍💻 Hiring junior devs
        </h4>
        <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/90">
          Het denken over hiring is in drie weken gekanteld. Begin april zat de lijn op
          <span className="font-semibold text-foreground"> consolideren en runway beschermen</span>—
          geen nieuwe commitments. Vanaf 14 april verschuift dat naar
          <span className="font-semibold text-foreground"> actief werven van twee junior devs</span>
          , gedreven door de roadmap-druk die Stef op tafel legde. Wouter blijft de
          onboarding-capaciteit als rem benoemen; die zorg is nog niet geadresseerd en staat
          centraal bij de open vragen.
        </p>
        <div className="mt-3 flex gap-2">
          <button className="rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent">
            👍 Klopt
          </button>
          <button className="rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent">
            Herschrijven
          </button>
          <button className="rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent">
            Korter
          </button>
        </div>
      </div>
    </VariantCard>
  );
}

/* C14 — Wie zegt wat per persoon ────────────────────────── */

function VariantC14() {
  const quotes = QUOTES.t1;
  return (
    <VariantCard
      id="C14"
      title="Wie-zegt-wat per persoon"
      subtitle="Per persoon hun top-quotes over dit thema. Feeling voor ieders standpunt."
      tunable={["Quotes per persoon", "Sortering", "Sentiment-tag"]}
    >
      <div className="space-y-3">
        {PEOPLE.filter((p) => quotes.some((q) => q.personId === p.id)).map((p) => {
          const personQuotes = quotes.filter((q) => q.personId === p.id);
          return (
            <div key={p.id} className="rounded-xl border border-border/60 bg-card p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
                  {p.name[0]}
                </div>
                <div className="text-[13px] font-semibold text-foreground">{p.name}</div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {personQuotes.length} quotes
                </span>
              </div>
              <div className="space-y-2 pl-9">
                {personQuotes.map((q, i) => (
                  <div key={i} className="relative">
                    <MessageSquareQuote className="absolute -left-5 top-0.5 h-3 w-3 text-muted-foreground/40" />
                    <blockquote className="text-[12.5px] italic text-foreground/90">
                      &quot;{q.quote}&quot;
                    </blockquote>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{q.date}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </VariantCard>
  );
}

/* C15 — Theme-vs-theme split view ──────────────────────── */

function VariantC15() {
  const a = THEMES[0]; // Hiring
  const b = THEMES[5]; // Onboarding
  return (
    <VariantCard
      id="C15"
      title="Theme-vs-theme split view"
      subtitle="Twee thema's naast elkaar. Vindt overlap en tegenstellingen."
      tunable={["Vergelijkings-velden", "Default tweede thema", "Highlight overlap"]}
      span={2}
    >
      <div className="grid grid-cols-2 gap-4">
        {[a, b].map((t) => (
          <div key={t.id} className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{t.emoji}</span>
              <div className="flex-1">
                <h4 className="font-heading text-[14px] font-semibold text-foreground">{t.name}</h4>
                <p className="text-[11px] text-muted-foreground">{t.description}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-muted/40 p-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  Mentions 30d
                </div>
                <div className="mt-0.5 font-heading text-[15px] font-semibold text-foreground">
                  {t.mentions30d}
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  Aandeel
                </div>
                <div className="mt-0.5 font-heading text-[15px] font-semibold text-foreground">
                  {t.share}%
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-3 w-3" /> Topspreker
              </div>
              <div className="text-[12px] text-foreground">{t.id === "t1" ? "Stef" : "Wouter"}</div>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" /> Laatst besproken
              </div>
              <div className="text-[12px] text-foreground">{t.lastMentionedDays}d geleden</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[12px] text-foreground">
        <span className="font-semibold text-primary">Overlap:</span> 2 gedeelde meetings, 1 gedeelde
        open vraag (&quot;Wie begeleidt de eerste 4 weken van nieuwe hires?&quot;).
      </div>
    </VariantCard>
  );
}
