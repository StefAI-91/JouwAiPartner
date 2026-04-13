"use client";

import { useState } from "react";
import {
  BookUser,
  BrainCircuit,
  Calendar,
  ClipboardCheck,
  FolderKanban,
  Home,
  Mail,
  Sparkles,
  Sun,
  ArrowUpRight,
  AlertCircle,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";
import {
  focusByScenario,
  scenarios,
  scoringWeights,
  type FocusProject,
  type HealthStatus,
  type ScenarioKey,
} from "./mock-data";

type VariantKey = "minimal" | "rich" | "briefing";

const variants: { key: VariantKey; label: string; tag: string; description: string }[] = [
  {
    key: "minimal",
    label: "A — Minimaal",
    tag: "Conservatief",
    description:
      "Huidige nav blijft. Een kleine 'Focus' sectie onder Projects met 5 items. Reden zichtbaar op hover.",
  },
  {
    key: "rich",
    label: "B — Rijk",
    tag: "Aanbevolen",
    description:
      "AI-gecureerde focus verschijnt bovenaan de sidebar als primaire sectie. Elke kaart toont health, reden en acties.",
  },
  {
    key: "briefing",
    label: "C — Briefing",
    tag: "Radicaal",
    description:
      "Sidebar is een dagelijkse stand-up. Begroeting, 3-5 focus-kaarten met volledige context. Overige nav klapt weg.",
  },
];

/* ────────────────────────────────────────────────────────────
   Hulpcomponenten
   ──────────────────────────────────────────────────────────── */

function HealthDot({ status, pulse = false }: { status: HealthStatus; pulse?: boolean }) {
  const color =
    status === "rood" ? "bg-rose-500" : status === "oranje" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {pulse && status !== "groen" && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`}
        />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

function HealthBar({ status }: { status: HealthStatus }) {
  const color =
    status === "rood" ? "bg-rose-500" : status === "oranje" ? "bg-amber-500" : "bg-emerald-500";
  return <span className={`h-full w-[3px] shrink-0 rounded-full ${color}`} />;
}

function NavRow({
  icon: Icon,
  label,
  active = false,
  badge,
  muted = false,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 ${muted ? "py-1.5" : "py-2"} text-sm font-medium ${
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
      }`}
    >
      <Icon className={`${muted ? "h-4 w-4" : "h-[18px] w-[18px]"} shrink-0`} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Variant A — Minimaal
   ──────────────────────────────────────────────────────────── */

function VariantMinimal({ focus }: { focus: FocusProject[] }) {
  return (
    <div className="flex h-full flex-col gap-0.5 p-3">
      <NavRow icon={Home} label="Home" />
      <NavRow icon={BrainCircuit} label="Intelligence" />
      <NavRow icon={ClipboardCheck} label="Review" badge={7} />
      <NavRow icon={FolderKanban} label="Projects" active />
      <NavRow icon={BookUser} label="Directory" />

      <SectionLabel>Focus</SectionLabel>
      {focus.slice(0, 5).map((p) => (
        <div
          key={p.id}
          className="group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-foreground/80 hover:bg-muted/60"
        >
          <HealthDot status={p.health} pulse={p.health === "rood"} />
          <span className="flex-1 truncate">{p.name}</span>
          {p.openActions > 0 && (
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
              {p.openActions}
            </span>
          )}
        </div>
      ))}

      <SectionLabel>Bronnen</SectionLabel>
      <NavRow icon={Calendar} label="Meetings" muted />
      <NavRow icon={Mail} label="Emails" muted />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Variant B — Rijk (aanbevolen)
   ──────────────────────────────────────────────────────────── */

function VariantRich({ focus, timeLabel }: { focus: FocusProject[]; timeLabel: string }) {
  return (
    <div className="flex h-full flex-col p-3">
      {/* Focus-sectie bovenaan */}
      <div className="mb-3 px-1">
        <div className="flex items-center gap-2 px-2 pb-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Focus
          </span>
          <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
            {timeLabel}
          </span>
        </div>

        <div className="space-y-1">
          {focus.slice(0, 4).map((p) => (
            <button
              key={p.id}
              className="group relative flex w-full gap-2.5 rounded-lg bg-white/40 p-2 text-left transition-all hover:bg-white hover:shadow-sm"
            >
              <HealthBar status={p.health} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-foreground">
                    {p.name}
                  </span>
                  {p.openActions > 0 && (
                    <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground/90 px-1.5 text-[10px] font-bold tabular-nums text-background">
                      {p.openActions}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.35] text-muted-foreground">
                  {p.reason}
                </p>
              </div>
            </button>
          ))}
        </div>

        <button className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium text-muted-foreground/70 hover:text-foreground">
          Alle projecten <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>

      <div className="mx-1 mb-2 h-px bg-border/60" />

      {/* Overige nav */}
      <div className="flex flex-col gap-0.5">
        <NavRow icon={Home} label="Home" />
        <NavRow icon={BrainCircuit} label="Intelligence" />
        <NavRow icon={ClipboardCheck} label="Review" badge={7} />
        <NavRow icon={FolderKanban} label="Projects" />
        <NavRow icon={BookUser} label="Directory" />

        <SectionLabel>Bronnen</SectionLabel>
        <NavRow icon={Calendar} label="Meetings" muted />
        <NavRow icon={Mail} label="Emails" muted />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Variant C — Dagelijkse briefing
   ──────────────────────────────────────────────────────────── */

function VariantBriefing({
  focus,
  greeting,
  subheading,
  timeLabel,
}: {
  focus: FocusProject[];
  greeting: string;
  subheading: string;
  timeLabel: string;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Header met begroeting */}
      <div className="relative overflow-hidden rounded-t-[inherit] border-b border-border/40 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent px-4 pb-4 pt-5">
        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary/70">
          <Sun className="h-3 w-3" />
          {timeLabel}
        </div>
        <h3 className="font-heading mt-1.5 text-[17px] font-semibold leading-tight text-foreground">
          {greeting}
        </h3>
        <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{subheading}</p>
      </div>

      {/* Focus kaarten — meer context */}
      <div className="flex-1 space-y-2 p-3">
        {focus.map((p, idx) => (
          <div
            key={p.id}
            className={`group relative overflow-hidden rounded-xl border bg-card p-3 transition-all hover:shadow-md ${
              idx === 0 ? "border-primary/20 ring-1 ring-primary/10" : "border-border/60"
            }`}
          >
            {/* Priority indicator */}
            {idx === 0 && (
              <div className="absolute -right-8 top-2 rotate-45 bg-primary px-8 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-foreground">
                Nu
              </div>
            )}

            <div className="flex items-start gap-2">
              <div className="pt-1">
                <HealthDot status={p.health} pulse={p.health === "rood" && idx === 0} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-foreground">
                    {p.name}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground/70">
                    · {p.organization}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-[1.4] text-foreground/75">
                  {p.reason}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground/70">
                  <span className="flex items-center gap-1">
                    <CircleDashed className="h-3 w-3" />
                    {p.lastSignal}
                  </span>
                  {p.openActions > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {p.openActions} {p.openActions === 1 ? "actie" : "acties"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Collapsed footer nav */}
      <div className="border-t border-border/40 bg-muted/30 p-2">
        <div className="grid grid-cols-5 gap-0.5">
          {[
            { icon: Home, label: "Home" },
            { icon: BrainCircuit, label: "Intel" },
            { icon: ClipboardCheck, label: "Review" },
            { icon: FolderKanban, label: "All" },
            { icon: BookUser, label: "Dir" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-0.5 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              <span className="text-[9px]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Sidebar device frame
   ──────────────────────────────────────────────────────────── */

function SidebarFrame({
  variant,
  label,
  tag,
  description,
  children,
  highlight = false,
}: {
  variant: VariantKey;
  label: string;
  tag: string;
  description: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col">
      {/* Label bar */}
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="font-heading text-[15px] font-semibold text-foreground">{label}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/80"
            }`}
          >
            {tag}
          </span>
        </div>
      </div>

      {/* Device frame */}
      <div
        className={`relative overflow-hidden rounded-2xl border bg-sidebar shadow-xl transition-all ${
          highlight ? "border-primary/30 shadow-primary/10" : "border-border/60"
        }`}
      >
        {/* Fake top chrome (titlebar dots) */}
        <div className="flex items-center gap-1.5 border-b border-border/40 bg-background/60 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
          <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
            cockpit · sidebar · {variant}
          </span>
        </div>

        {/* Content area — sized like a real sidebar */}
        <div className="h-[620px] w-full overflow-y-auto scrollbar-none">{children}</div>
      </div>

      {/* Description */}
      <p className="mt-3 text-[12.5px] leading-[1.5] text-muted-foreground">{description}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Signal panel
   ──────────────────────────────────────────────────────────── */

function SignalsPanel({ focus }: { focus: FocusProject[] }) {
  const top = focus[0];
  if (!top) return null;

  const maxTotal = scoringWeights.reduce((sum, w) => sum + w.max, 0);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
            <Sparkles className="h-3 w-3" />
            Scoring voor #1
          </div>
          <h3 className="font-heading mt-1 text-[18px] font-semibold">{top.name}</h3>
        </div>
        <div className="text-right">
          <div className="font-mono text-[32px] font-bold tabular-nums leading-none text-primary">
            {top.score}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
            van {maxTotal} punten
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {scoringWeights.map((w) => {
          const value = top.signals[w.key as keyof typeof top.signals];
          const pct = (value / w.max) * 100;
          return (
            <div key={w.key}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="text-foreground/80">{w.label}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {value}
                  <span className="text-muted-foreground/40"> / {w.max}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-lg bg-muted/50 p-3 text-[11.5px] leading-[1.5] text-muted-foreground">
        <span className="font-semibold text-foreground">Zo werkt het: </span>
        AI combineert gezondheid (Weekly Summarizer), openstaande acties, recente activiteit en of
        de klant wacht. Signalen zijn al verified — geen onbeoordeelde AI-output in de nav.
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────────────────── */

export function NavigatiePlayground() {
  const [scenario, setScenario] = useState<ScenarioKey>("maandag-ochtend");

  const activeScenario = scenarios.find((s) => s.key === scenario)!;
  const focus = focusByScenario[scenario];

  return (
    <div className="space-y-10">
      {/* Scenario toggle */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
              Scenario
            </div>
            <div className="font-heading text-[15px] font-semibold">
              Hoe verschuift de focus door de week?
            </div>
          </div>
          <div className="ml-auto flex gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
            {scenarios.map((s) => (
              <button
                key={s.key}
                onClick={() => setScenario(s.key)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                  scenario === s.key
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drie varianten naast elkaar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SidebarFrame
          variant="minimal"
          label={variants[0].label}
          tag={variants[0].tag}
          description={variants[0].description}
        >
          <VariantMinimal focus={focus} />
        </SidebarFrame>

        <SidebarFrame
          variant="rich"
          label={variants[1].label}
          tag={variants[1].tag}
          description={variants[1].description}
          highlight
        >
          <VariantRich focus={focus} timeLabel={activeScenario.timeLabel} />
        </SidebarFrame>

        <SidebarFrame
          variant="briefing"
          label={variants[2].label}
          tag={variants[2].tag}
          description={variants[2].description}
        >
          <VariantBriefing
            focus={focus}
            greeting={activeScenario.greeting}
            subheading={activeScenario.subheading}
            timeLabel={activeScenario.timeLabel}
          />
        </SidebarFrame>
      </div>

      {/* Scoring uitleg */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SignalsPanel focus={focus} />
        </div>
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-5 lg:col-span-2">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            <BrainCircuit className="h-3.5 w-3.5" />
            Volgende stappen
          </div>
          <h3 className="font-heading mt-1 text-[18px] font-semibold">Van mockup naar productie</h3>
          <ol className="mt-4 space-y-3 text-[12.5px] leading-[1.55]">
            <li className="flex gap-3">
              <span className="font-mono text-primary">01</span>
              <div>
                <div className="font-semibold text-foreground">Fase 0 — Foundation</div>
                <div className="text-muted-foreground">
                  Bouw <code className="font-mono text-[11px]">getFocusProjects()</code> query op
                  bestaande signalen: weekly summary status, open actions, updated_at.
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary">02</span>
              <div>
                <div className="font-semibold text-foreground">Fase 1 — AI-reden</div>
                <div className="text-muted-foreground">
                  Hergebruik Project Summarizer briefing voor de één-regel-reden per kaart.
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary">03</span>
              <div>
                <div className="font-semibold text-foreground">Fase 2 — Dispatcher</div>
                <div className="text-muted-foreground">
                  Dispatcher agent (Phase E) neemt de ranking over en voedt ook Slack.
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary">04</span>
              <div>
                <div className="font-semibold text-foreground">Fase 3 — Feedback loop</div>
                <div className="text-muted-foreground">
                  Track klikgedrag als label-data. Mens stuurt — systeem leert.
                </div>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
