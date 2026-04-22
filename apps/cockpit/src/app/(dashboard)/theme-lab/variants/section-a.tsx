"use client";

import {
  Search,
  ChevronRight,
  Hash,
  ArrowRight,
  Calendar,
  Users,
  X,
  PanelRightOpen,
  Sparkles,
} from "lucide-react";
import { THEMES, MEETINGS } from "../mock-data";
import { VariantCard } from "../theme-lab";

function tempDot(temp: string) {
  switch (temp) {
    case "hot":
      return "bg-red-500";
    case "warm":
      return "bg-amber-500";
    case "cool":
      return "bg-sky-400";
    case "cold":
      return "bg-zinc-300";
    case "new":
      return "bg-blue-500";
    default:
      return "bg-zinc-300";
  }
}

export function SectionA() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <VariantA1 />
      <VariantA2 />
      <VariantA3 />
      <VariantA4 />
      <VariantA5 />
    </div>
  );
}

/* A1 — Floating theme pills ─────────────────────────────── */

function VariantA1() {
  const topEight = THEMES.slice(0, 8);
  return (
    <VariantCard
      id="A1"
      title="Floating theme pills"
      subtitle="Horizontale strip bovenaan het dashboard — top 8 meest actieve thema's."
      tunable={["Aantal pills", "Sortering", "Data op hover"]}
      span={2}
    >
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-medium text-muted-foreground">
            Actieve thema&apos;s · laatste 30 dagen
          </div>
          <button className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
            Alle 24 thema&apos;s <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {topEight.map((t) => (
            <button
              key={t.id}
              className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-[13px] font-medium text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow"
            >
              <span>{t.emoji}</span>
              <span>{t.name}</span>
              <span className="rounded-full bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {t.mentions30d}
              </span>
            </button>
          ))}
        </div>
      </div>
    </VariantCard>
  );
}

/* A2 — Theme-wolk met gewicht ─────────────────────────── */

function VariantA2() {
  return (
    <VariantCard
      id="A2"
      title="Theme-wolk (weighted)"
      subtitle="Alle thema's zichtbaar, groter = actiever. Visuele hiërarchie in plaats van lijst."
      tunable={["Grootste/kleinste schaal", "Kleur-as", "Max zichtbaar"]}
    >
      <div className="flex min-h-[200px] flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-xl border border-border/60 bg-muted/20 p-6">
        {THEMES.map((t) => {
          const size = Math.max(12, Math.min(28, 11 + t.mentions30d * 1.2));
          const opacity = 0.55 + (t.mentions30d / 14) * 0.45;
          return (
            <span
              key={t.id}
              className="cursor-pointer font-heading font-semibold text-foreground transition-transform hover:-translate-y-0.5 hover:text-primary"
              style={{ fontSize: `${size}px`, opacity, lineHeight: 1.1 }}
            >
              {t.name}
            </span>
          );
        })}
      </div>
    </VariantCard>
  );
}

/* A3 — Command palette (⌘K) ───────────────────────────── */

function VariantA3() {
  return (
    <VariantCard
      id="A3"
      title="Command palette (⌘K)"
      subtitle="Typen in plaats van klikken. Klein UI-voetspoor, groot bereik."
      tunable={["Sneltoets", "Fuzzy match", "Recent/top sorting"]}
    >
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-muted/30 to-muted/10 p-6">
        <div className="mx-auto max-w-[440px] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 text-[13px] text-foreground">
              hir<span className="animate-pulse">|</span>
            </div>
            <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              esc
            </kbd>
          </div>
          <div className="px-2 py-2">
            <div className="mb-1 px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Thema&apos;s
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-2 py-2">
              <Hash className="h-3.5 w-3.5 text-primary" />
              <div className="flex-1">
                <div className="text-[13px] font-medium text-foreground">
                  <mark className="bg-primary/20 px-0.5 text-primary">Hir</mark>ing junior devs
                </div>
                <div className="text-[11px] text-muted-foreground">
                  14 mentions · laatst 1d geleden
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-[13px] text-foreground">Onboarding proces</div>
                <div className="text-[11px] text-muted-foreground">
                  5 mentions · bevat &quot;hiring&quot;
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VariantCard>
  );
}

/* A4 — Theme sidebar drawer ──────────────────────────── */

function VariantA4() {
  return (
    <VariantCard
      id="A4"
      title="Theme sidebar drawer"
      subtitle="Permanent oproepbaar paneel rechts, sticky per pagina."
      tunable={["Default open/dicht", "Breedte", "Filter-opties"]}
    >
      <div className="relative h-[340px] overflow-hidden rounded-xl border border-border/60 bg-muted/10">
        {/* Fake page content */}
        <div className="absolute inset-0 p-4 pr-[180px]">
          <div className="mb-3 h-5 w-1/3 rounded bg-muted" />
          <div className="mb-1.5 h-2.5 w-full rounded bg-muted/70" />
          <div className="mb-1.5 h-2.5 w-5/6 rounded bg-muted/70" />
          <div className="mb-4 h-2.5 w-4/6 rounded bg-muted/70" />
          <div className="mb-3 h-4 w-1/4 rounded bg-muted" />
          <div className="mb-1.5 h-2.5 w-full rounded bg-muted/70" />
          <div className="mb-1.5 h-2.5 w-3/4 rounded bg-muted/70" />
        </div>
        {/* Drawer */}
        <div className="absolute inset-y-0 right-0 w-[170px] border-l border-border/60 bg-card p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <PanelRightOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-foreground">Thema&apos;s</span>
            </div>
            <X className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            {THEMES.slice(0, 7).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md px-2 py-1 text-[11px] text-foreground hover:bg-accent"
              >
                <span className="truncate">
                  <span className="mr-1">{t.emoji}</span>
                  {t.name}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground">{t.mentions30d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </VariantCard>
  );
}

/* A5 — Theme chips op meeting cards ──────────────────── */

function VariantA5() {
  const meeting = MEETINGS[0];
  return (
    <VariantCard
      id="A5"
      title="Theme-chips op meeting cards"
      subtitle="Overal waar een meeting verschijnt, zie je 2-3 theme-chips. Organische discovery."
      tunable={["Max chips per card", "Kleur per theme", "Klikbaar gedrag"]}
    >
      <div className="space-y-3">
        {[meeting, MEETINGS[1], MEETINGS[2]].map((m) => {
          const themes = m.themeIds.map((id) => THEMES.find((t) => t.id === id)!);
          return (
            <div
              key={m.id}
              className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-[14px] font-semibold text-foreground">{m.title}</h4>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {m.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {m.participants.join(", ")}
                    </span>
                  </div>
                </div>
                <Sparkles className="h-4 w-4 text-primary/40" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {themes.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-inset ring-primary/15"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${tempDot(t.temp)}`} />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </VariantCard>
  );
}
