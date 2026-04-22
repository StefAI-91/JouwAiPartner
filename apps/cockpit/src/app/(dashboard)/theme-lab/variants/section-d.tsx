"use client";

import {
  AlertOctagon,
  ArrowRight,
  Calendar,
  Clock,
  Mail,
  Sparkles,
  TrendingUp,
  TrendingDown,
  CircleDot,
} from "lucide-react";
import { CONTRADICTIONS, THEMES } from "../mock-data";
import { VariantCard } from "../theme-lab";

export function SectionD() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <VariantD16 />
      <VariantD17 />
      <VariantD18 />
      <VariantD19 />
    </div>
  );
}

/* D16 — Weekly digest email ───────────────────────────── */

function VariantD16() {
  return (
    <VariantCard
      id="D16"
      title="Weekly theme digest (email)"
      subtitle="Maandagochtend in je inbox: wat speelde er, wat verschuift, wat blijft stil."
      tunable={["Dag/tijd", "Aantal highlights", "Inclusief contradicties"]}
      span={2}
    >
      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="border-b border-border/60 bg-muted/40 px-5 py-3 text-[11px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              van <strong>platform@jouwaipartner.nl</strong>
            </span>
            <span>ma 21 april · 08:00</span>
          </div>
          <div className="mt-1 text-foreground">
            <strong>Jullie week in thema&apos;s — week 17</strong>
          </div>
        </div>
        <div className="space-y-5 px-6 py-5">
          <p className="text-[13px] leading-relaxed text-foreground">
            Hoi Stef & Wouter — vijf dingen uit afgelopen week die opvielen.
          </p>

          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              <TrendingUp className="h-3 w-3" /> Verschoven
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-[12.5px]">
              <strong>👩‍💻 Hiring junior devs</strong> — van &quot;consolideren&quot; naar &quot;twee
              junior devs werven dit kwartaal&quot;. Besluit genomen op 21 apr.
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              <AlertOctagon className="h-3 w-3" /> Spanningsveld
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[12.5px]">
              Stef duwt op tempo voor hiring, Wouter zet onboarding-capaciteit als rem neer. Nog
              geen gezamenlijk antwoord.
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-sky-700">
              <Sparkles className="h-3 w-3" /> Nieuw opgedoken
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-[12.5px]">
              <strong>🧳 Onboarding proces</strong> — 2 meetings deze week. Status: emerging, nog
              niet verified. <a className="text-primary underline">Review nu</a>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <TrendingDown className="h-3 w-3" /> Stil gevallen
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-[12.5px]">
              🧱 Tech debt (22d), 🏠 Remote vs office (26d). Bewust geparkeerd of vergeten?
            </div>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-[12px] text-foreground">
            <strong>Deze week te landen:</strong> drie open vragen over hiring staan al &gt; 7 dagen
            open. <a className="text-primary underline">Open review</a>
          </div>
        </div>
      </div>
    </VariantCard>
  );
}

/* D17 — In-meeting breadcrumbs ────────────────────────── */

function VariantD17() {
  return (
    <VariantCard
      id="D17"
      title="In-meeting breadcrumbs"
      subtitle="Open een meeting → banner die zegt welke thema's hij raakt én met welke geschiedenis."
      tunable={["Max thema's", "Copy-toon", "Wel/niet clickable"]}
    >
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="border-b border-border/60 p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Meeting · 21 april 2026
          </div>
          <h4 className="font-heading mt-1 text-[15px] font-semibold text-foreground">
            Wekelijkse founders sync
          </h4>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Stef, Wouter
          </div>
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-[12.5px]">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="text-foreground">
              Deze meeting raakt <strong className="text-primary">👩‍💻 Hiring junior devs</strong>{" "}
              <span className="text-muted-foreground">(3e keer deze maand)</span>,{" "}
              <strong className="text-primary">📈 Sales pipeline</strong>{" "}
              <span className="text-muted-foreground">(recurring)</span>, en{" "}
              <strong className="text-primary">🤖 AI-agent roadmap</strong>{" "}
              <span className="text-muted-foreground">(nieuw sinds vorige week)</span>.
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Tip: klik op een thema om de geschiedenis te zien.
          </div>
        </div>
      </div>
    </VariantCard>
  );
}

/* D18 — Contradiction banner ──────────────────────────── */

function VariantD18() {
  const c = CONTRADICTIONS[0];
  const theme = THEMES.find((t) => t.id === c.themeId)!;
  return (
    <VariantCard
      id="D18"
      title="Contradiction banner"
      subtitle="Curator detecteert tegenstrijdig besluit. Zichtbaar op thema-pagina."
      tunable={["Gevoeligheid detectie", "Dismiss-gedrag", "Ernst-niveaus"]}
    >
      <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <AlertOctagon className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-red-900">
              Tegenstrijdig besluit gedetecteerd
            </div>
            <div className="text-[11px] text-red-700/80">
              In thema {theme.emoji} {theme.name}
            </div>
          </div>
        </div>
        <div className="space-y-2 pl-9">
          <div className="rounded-lg border border-red-200 bg-white/80 px-3 py-2">
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span>{c.earlier.date}</span>
              <span>·</span>
              <span>Finance review</span>
            </div>
            <div className="mt-0.5 text-[12px] text-foreground">{c.earlier.decision}</div>
          </div>
          <div className="flex items-center justify-center">
            <div className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700">
              vs
            </div>
          </div>
          <div className="rounded-lg border border-red-300 bg-white/80 px-3 py-2 ring-2 ring-red-500/10">
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span>{c.later.date}</span>
              <span>·</span>
              <span>Wekelijkse founders sync</span>
            </div>
            <div className="mt-0.5 text-[12px] font-medium text-foreground">{c.later.decision}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2 pl-9">
          <button className="rounded-md border border-red-300 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100">
            Bespreken
          </button>
          <button className="rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent">
            Bewust · dismiss
          </button>
        </div>
      </div>
    </VariantCard>
  );
}

/* D19 — "Tijd om te landen" prompt ────────────────────── */

function VariantD19() {
  return (
    <VariantCard
      id="D19"
      title='"Tijd om te landen" prompt'
      subtitle="Thema &gt; 4 weken open zonder decision krijgt een subtiele nudge."
      tunable={["Drempel (weken)", "Plaatsing (dashboard/mail)", "Copy-toon"]}
    >
      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-50/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Clock className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-amber-900">Tijd om te landen?</div>
            <div className="text-[11px] text-amber-700/80">
              Dit thema loopt al 5 weken — nog geen besluit
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-white/80 p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧳</span>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-foreground">Onboarding proces</div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CircleDot className="h-2.5 w-2.5" /> 5 meetings
                </span>
                <span>3 open vragen</span>
                <span>0 besluiten</span>
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-border/50 pt-2.5 text-[12px] italic text-muted-foreground">
            &quot;We blijven erover praten maar we komen niet tot een richting. Willen jullie hier
            deze week een besluit over forceren?&quot;
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90">
            Besluit inplannen <ArrowRight className="h-3 w-3" />
          </button>
          <button className="rounded-md border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent">
            Bewust open houden
          </button>
        </div>
      </div>
    </VariantCard>
  );
}
