import Link from "next/link";
import {
  Inbox,
  Target,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Flame,
  Settings2,
  HelpCircle,
} from "lucide-react";
import { cn } from "@repo/ui/utils";

// ──────────────────────────────────────────────────────────────────────────
// Preview-pagina voor sprint DH-012 (prioritization system + Deze week op
// dashboard). Pure mock met hardcoded data, geen DB-calls. Doel: laat Stef
// visueel zien wat we gaan bouwen vóór we de echte implementatie starten.
// Verwijderen zodra de sprint live is.
// URL: /preview-dh-012
// ──────────────────────────────────────────────────────────────────────────

type MockPriority = "P0" | "P1" | "P2" | "P3";

const PRIO_CONFIG: Record<
  MockPriority,
  { label: string; sla: string; bg: string; text: string; border: string; ring: string }
> = {
  P0: {
    label: "P0 — Kritiek",
    sla: "Vandaag",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    ring: "ring-red-500",
  },
  P1: {
    label: "P1 — Urgent",
    sla: "Deze week",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    ring: "ring-orange-500",
  },
  P2: {
    label: "P2 — Normaal",
    sla: "Binnen 2 weken",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    ring: "ring-yellow-500",
  },
  P3: {
    label: "P3 — Nice-to-have",
    sla: "Wanneer ruimte",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    ring: "ring-slate-400",
  },
};

function PrioBadge({ prio, size = "sm" }: { prio: MockPriority; size?: "sm" | "md" }) {
  const c = PRIO_CONFIG[prio];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-mono font-semibold",
        c.bg,
        c.text,
        c.border,
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
      )}
    >
      {prio}
    </span>
  );
}

function MockAvatar({ name, color }: { name: string; color: string }) {
  return (
    <div
      className={cn(
        "flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white",
        color,
      )}
    >
      {name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </div>
  );
}

function MockIssueLine({
  number,
  title,
  prio,
  unTriaged,
  showClaim,
}: {
  number: number;
  title: string;
  prio: MockPriority;
  unTriaged?: boolean;
  showClaim?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 pl-10 pr-3 hover:bg-muted/40">
      <PrioBadge prio={prio} />
      <span className="shrink-0 font-mono text-xs text-muted-foreground">#{number}</span>
      <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
      {unTriaged && (
        <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
          Nog te triëren
        </span>
      )}
      {showClaim && (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
        >
          Claim
          <ArrowRight className="size-3" />
        </button>
      )}
    </div>
  );
}

function AssigneeGroup({
  name,
  color,
  count,
  unassigned,
  children,
}: {
  name: string;
  color: string;
  count: number;
  unassigned?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border-b border-border last:border-0", unassigned && "bg-amber-50/30")}>
      <div className="flex items-center gap-2 px-3 py-2">
        {unassigned ? (
          <div className="flex size-7 items-center justify-center rounded-full border-2 border-dashed border-amber-400 text-amber-600">
            <HelpCircle className="size-3.5" />
          </div>
        ) : (
          <MockAvatar name={name} color={color} />
        )}
        <span
          className={cn("text-sm font-semibold", unassigned ? "text-amber-700" : "text-foreground")}
        >
          {name}
        </span>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      <div className="pb-2">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  description,
  children,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            {badge && (
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function PreviewDH012Page() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-6 py-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5" />
          Sprint DH-012 — Mock preview (v2)
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Prioritization System</h1>
        <p className="max-w-2xl text-muted-foreground">
          Drie ingrepen die op elkaar voortbouwen. Geen aparte route — "Deze week" komt op het
          dashboard zelf zodat de sidebar schoon blijft. Dit is een mock, geen echte data.
        </p>
      </div>

      {/* 1. P-niveaus */}
      <SectionCard
        icon={<Target className="size-5" />}
        title="1. P-niveaus & definities"
        description="Vier prioriteiten met heldere SLA's. Iedereen praat dezelfde taal."
      >
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          {(Object.keys(PRIO_CONFIG) as MockPriority[]).map((p) => {
            const c = PRIO_CONFIG[p];
            return (
              <div key={p} className={cn("rounded-md border p-4", c.border, c.bg)}>
                <div className="flex items-center justify-between">
                  <PrioBadge prio={p} size="md" />
                  <span className={cn("text-xs font-medium", c.text)}>{c.sla}</span>
                </div>
                <p className={cn("mt-2 text-sm font-medium", c.text)}>{c.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p === "P0" && "Productie down, data verlies, klant kan niet werken."}
                  {p === "P1" && "Belangrijke functie kapot, geen workaround."}
                  {p === "P2" && "Werkt wel maar suboptimaal, of workaround mogelijk."}
                  {p === "P3" && "Polish, kleine feature requests, geen blokkade."}
                </p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* 2. Deze week op dashboard — DE KERN VAN DE WIJZIGING */}
      <SectionCard
        icon={<Flame className="size-5" />}
        title='2. Sectie "Deze week" op het dashboard'
        description="Team-focus: bovenaan urgent (open P0+P1), daaronder actief (in_progress). Per persoon gegroepeerd."
        badge="Nieuw — geen aparte route"
      >
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Locatie: dashboard <code className="font-mono text-foreground">/</code> · plek: na de
            metric-tegels, vóór de intake-chart · sidebar:{" "}
            <strong className="text-foreground">geen wijziging</strong>
          </p>
        </div>

        {/* Subsectie A: Urgent */}
        <div className="border-b border-border">
          <div className="flex items-center gap-2 bg-red-50/40 px-5 py-2.5">
            <Flame className="size-4 text-red-600" />
            <h3 className="text-sm font-semibold text-red-700">Urgent — open P0 + P1 (4)</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              Wat moet deze week gebeuren
            </span>
          </div>

          <AssigneeGroup name="Wouter" color="bg-blue-500" count={2}>
            <MockIssueLine
              number={142}
              title="Login werkt niet meer na deploy — alle users buitengesloten"
              prio="P0"
            />
            <MockIssueLine
              number={138}
              title="PDF-export geeft lege pagina bij meer dan 50 records"
              prio="P1"
            />
          </AssigneeGroup>

          <AssigneeGroup name="Stef" color="bg-purple-500" count={1}>
            <MockIssueLine
              number={134}
              title="Filters resetten zichzelf na pagina-refresh"
              prio="P1"
            />
          </AssigneeGroup>

          <AssigneeGroup name="Niemand" color="" count={1} unassigned>
            <MockIssueLine
              number={156}
              title="Tooltip te kort op mobile — knipt af bij lange tekst"
              prio="P1"
              showClaim
            />
          </AssigneeGroup>
        </div>

        {/* Subsectie B: Actief */}
        <div>
          <div className="flex items-center gap-2 bg-amber-50/40 px-5 py-2.5">
            <Settings2 className="size-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-700">
              Actief in behandeling — status: in_progress (2)
            </h3>
            <span className="ml-auto text-xs text-muted-foreground">Wat loopt nu</span>
          </div>

          <AssigneeGroup name="Wouter" color="bg-blue-500" count={1}>
            <MockIssueLine
              number={110}
              title="Onboarding-flow eerste stap herontwerpen"
              prio="P2"
            />
          </AssigneeGroup>

          <AssigneeGroup name="Ege" color="bg-emerald-500" count={1}>
            <MockIssueLine
              number={112}
              title="Email-templates voor onboarding & reminders"
              prio="P2"
            />
          </AssigneeGroup>
        </div>

        {/* Lege staat preview */}
        <div className="border-t border-dashed border-border bg-muted/20 px-5 py-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Lege staat (alle subsecties leeg)
          </p>
          <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-6">
            <div className="text-2xl">🌿</div>
            <div>
              <p className="font-medium">Geen urgente of actieve issues</p>
              <p className="text-sm text-muted-foreground">
                Mooi moment om P2 of P3 op te pakken via{" "}
                <Link href="/issues" className="text-primary hover:underline">
                  /issues
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-blue-200 bg-blue-50/40 px-5 py-3 text-sm">
          <p className="text-blue-900">
            <strong>Waarom op het dashboard:</strong> sidebar blijft schoon, manager-data (health,
            intake) en team-focus (deze week) staan op één pagina. Stand-up = open{" "}
            <code className="font-mono">/</code>, scroll, klaar.
          </p>
        </div>
      </SectionCard>

      {/* 3. Triage met dwang + auto-status */}
      <SectionCard
        icon={<Inbox className="size-5" />}
        title="3. Triage met dwang (auto-status)"
        description="Issue verlaat triage pas als prio gezet is. Status volgt automatisch — één klik minder."
        badge="Aangepast component"
      >
        <div className="space-y-4 p-5">
          {/* Mock issue header */}
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                Triage
              </span>
              <span className="font-mono text-sm text-muted-foreground">#147</span>
            </div>
            <h3 className="mt-1.5 text-base font-semibold">
              Knop "Opslaan" reageert niet op kleinere schermen (mobile)
            </h3>
          </div>

          {/* PRIO BAR — vereenvoudigd, geen status-radio meer */}
          <div className="rounded-md border-2 border-primary/40 bg-primary/5 p-4">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kies prioriteit
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["P0", "P1", "P2", "P3"] as MockPriority[]).map((p) => {
                    const c = PRIO_CONFIG[p];
                    const selected = p === "P1";
                    return (
                      <button
                        key={p}
                        type="button"
                        className={cn(
                          "rounded-md border px-3 py-2 text-sm font-medium transition-all",
                          selected
                            ? `${c.bg} ${c.text} ${c.border} ring-2 ${c.ring}`
                            : "border-border bg-card text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <span className="font-mono font-bold">{p}</span>
                        <span className="ml-1.5 hidden text-xs sm:inline">
                          {c.label.split(" — ")[1]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                <p className="text-blue-900">
                  <ArrowRight className="mr-1 inline size-3.5" />
                  <strong>P1 gekozen</strong> → status wordt automatisch{" "}
                  <strong className="text-blue-700">"Te doen"</strong>
                </p>
                <p className="mt-1 text-xs text-blue-700/80">
                  P0/P1 → Te doen · P2/P3 → Backlog · later wijzigen kan via sidebar
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-primary/20 pt-3">
                <p className="text-xs text-muted-foreground">
                  Prio gekozen? Bevestig om uit triage te halen.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Bevestig
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <p className="text-blue-900">
              <strong>Eén klik minder:</strong> waar je eerst prio + status moest kiezen, doe je nu
              alleen prio. De status volgt logisch (urgent gaat naar werklijst, niet naar backlog).
              Reviewer kan in de sidebar alsnog overrulen voor edge cases.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* 4. Issue-list voor/na */}
      <SectionCard
        icon={<Target className="size-5" />}
        title="4. Issue-lijst: badge in plaats van bolletje"
        description="Direct scanbaar — prio is meteen leesbaar zonder kleurcode te onthouden."
        badge="Aangepast component"
      >
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
          {/* Voor */}
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="bg-muted/40 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nu (PriorityDot)
              </p>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="size-2.5 rounded-full bg-red-500" />
                <span className="font-mono text-sm text-muted-foreground">#142</span>
                <span className="truncate text-sm">Login werkt niet meer...</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="size-2.5 rounded-full bg-orange-500" />
                <span className="font-mono text-sm text-muted-foreground">#138</span>
                <span className="truncate text-sm">PDF-export geeft lege pagina...</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="size-2.5 rounded-full bg-yellow-500" />
                <span className="font-mono text-sm text-muted-foreground">#121</span>
                <span className="truncate text-sm">Filter-dropdown sluit niet...</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="size-2.5 rounded-full bg-muted-foreground/40" />
                <span className="font-mono text-sm text-muted-foreground">#118</span>
                <span className="truncate text-sm">Tooltip te kort op mobile</span>
              </div>
            </div>
          </div>

          {/* Na */}
          <div>
            <div className="bg-primary/10 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Straks (PriorityBadge compact)
              </p>
            </div>
            <div className="divide-y divide-border">
              {[
                { num: 142, title: "Login werkt niet meer...", prio: "P0" as MockPriority },
                { num: 138, title: "PDF-export geeft lege pagina...", prio: "P1" as MockPriority },
                { num: 121, title: "Filter-dropdown sluit niet...", prio: "P2" as MockPriority },
                { num: 118, title: "Tooltip te kort op mobile", prio: "P3" as MockPriority },
                {
                  num: 147,
                  title: "Knop 'Opslaan' reageert niet op mobile",
                  prio: "P2" as MockPriority,
                  unTriaged: true,
                },
              ].map((row) => (
                <div key={row.num} className="flex items-center gap-2 px-4 py-3">
                  <PrioBadge prio={row.prio} />
                  <span className="font-mono text-sm text-muted-foreground">#{row.num}</span>
                  <span className="truncate text-sm flex-1">{row.title}</span>
                  {row.unTriaged && (
                    <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                      Nog te triëren
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Wat anders is t.o.v. v1 */}
      <div className="rounded-md border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-900">
        <strong className="text-foreground">Wat is veranderd t.o.v. v1 van de mock:</strong>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            ❌ <strong>Geen aparte route</strong> <code>/mijn-week</code> meer — sidebar blijft
            schoon
          </li>
          <li>
            ✅ <strong>"Deze week" als sectie op dashboard</strong> — team-view, niet alleen
            ingelogde user
          </li>
          <li>
            ✅ <strong>Per persoon gegroepeerd</strong> — direct zichtbaar wie waaraan werkt
          </li>
          <li>
            ✅ <strong>Auto-status in triage</strong> — P0/P1 → Te doen, P2/P3 → Backlog (geen losse
            status-keuze meer)
          </li>
          <li>
            ✅ <strong>Combinatie urgent + actief</strong> — wat moet en wat loopt, in één scherm
          </li>
        </ul>
      </div>

      {/* Footer */}
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Niet inbegrepen in deze sprint:</strong> AI suggested
        priority, DB-migratie van keys, Inbox/notificaties (volgende sprint DH-013), severity
        opruimen (DH-014), sidebar opschonen (DH-015). Volledige spec in{" "}
        <code>sprints/backlog/DH-012-prioritization-system.md</code>.
      </div>
    </div>
  );
}
