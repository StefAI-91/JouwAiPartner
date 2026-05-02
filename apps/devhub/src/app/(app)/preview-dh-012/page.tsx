import Link from "next/link";
import { Inbox, Target, AlertCircle, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@repo/ui/utils";

// ──────────────────────────────────────────────────────────────────────────
// Preview-pagina voor sprint DH-012 (prioritization system + Mijn Week).
// Pure mock met hardcoded data, geen DB-calls. Doel: laat Stef visueel zien
// wat we gaan bouwen vóór we de echte implementatie starten. Verwijderen
// zodra de sprint live is.
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
        "inline-flex items-center rounded-md font-mono font-semibold",
        c.bg,
        c.text,
        c.border,
        "border",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
      )}
    >
      {prio}
    </span>
  );
}

function MockIssueRow({
  number,
  title,
  prio,
  meta,
  unTriaged,
}: {
  number: number;
  title: string;
  prio: MockPriority;
  meta?: string;
  unTriaged?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/40">
      <PrioBadge prio={prio} />
      <span className="shrink-0 font-mono text-sm text-muted-foreground">#{number}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{title}</p>
          {unTriaged && (
            <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
              Nog te triëren
            </span>
          )}
        </div>
        {meta && <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>}
      </div>
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
          Sprint DH-012 — Mock preview
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Prioritization System</h1>
        <p className="max-w-2xl text-muted-foreground">
          Drie ingrepen die op elkaar voortbouwen. Hieronder zie je per onderdeel hoe het er straks
          in DevHub uit komt te zien. Dit is een mock — geen echte data, geen functionaliteit.
          Verwijderen zodra de sprint live is.
        </p>
      </div>

      {/* Naming-tabel */}
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

      {/* Mijn Week pagina */}
      <SectionCard
        icon={<Sparkles className="size-5" />}
        title="2. Pagina /mijn-week"
        description="Eén plek voor de developer: alleen jouw open P0 + P1 issues."
        badge="Nieuwe pagina"
      >
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <p className="text-xs text-muted-foreground">
            URL: <code className="font-mono text-foreground">/mijn-week</code> · sidebar nav: "Mijn
            week" (bovenaan, vóór Triage)
          </p>
        </div>

        {/* Groep P0 */}
        <div className="border-b border-border">
          <div className="flex items-center gap-2 bg-red-50/50 px-5 py-2.5">
            <AlertCircle className="size-4 text-red-600" />
            <h3 className="text-sm font-semibold text-red-700">P0 — Kritiek (1)</h3>
            <span className="text-xs text-muted-foreground">SLA: vandaag</span>
          </div>
          <MockIssueRow
            number={142}
            title="Login werkt niet meer na deploy — alle users zijn buitengesloten"
            prio="P0"
            meta="Project: Klant X · Toegewezen aan jou · 23 min geleden"
          />
        </div>

        {/* Groep P1 */}
        <div>
          <div className="flex items-center gap-2 bg-orange-50/50 px-5 py-2.5">
            <AlertCircle className="size-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-orange-700">P1 — Urgent (3)</h3>
            <span className="text-xs text-muted-foreground">SLA: deze week</span>
          </div>
          <MockIssueRow
            number={138}
            title="PDF-export geeft lege pagina terug bij meer dan 50 records"
            prio="P1"
            meta="Project: Klant X · Toegewezen aan jou · 2 uur geleden"
          />
          <MockIssueRow
            number={134}
            title="Filters resetten zichzelf na pagina-refresh"
            prio="P1"
            meta="Project: Klant Y · Toegewezen aan jou · gisteren"
          />
          <MockIssueRow
            number={129}
            title="Dashboard laadt traag bij grote datasets"
            prio="P1"
            meta="Project: Klant X · Toegewezen aan jou · 3 dagen geleden"
          />
        </div>

        {/* Lege staat preview */}
        <div className="border-t border-dashed border-border bg-muted/20 px-5 py-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Lege staat (als je niets open hebt)
          </p>
          <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-6">
            <div className="text-2xl">🌿</div>
            <div>
              <p className="font-medium">Geen urgente issues</p>
              <p className="text-sm text-muted-foreground">
                Adem rustig in. P2 en P3 wachten op{" "}
                <Link href="/issues" className="text-primary hover:underline">
                  /issues
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Triage prio-bar */}
      <SectionCard
        icon={<Inbox className="size-5" />}
        title="3. Triage met dwang"
        description="Issue verlaat triage pas als prio + status door reviewer gezet zijn."
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

          {/* PRIO BAR — de kern van deze sprint */}
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

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Volgende status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    Backlog
                  </button>
                  <button
                    type="button"
                    className="rounded-md border-2 border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 ring-2 ring-blue-200"
                  >
                    ✓ Te doen
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-primary/20 pt-3">
                <p className="text-xs text-muted-foreground">
                  Beide velden gevuld? Bevestig om uit triage te halen.
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
              <strong>Waarom dwang?</strong> Voorkomt dat issues per ongeluk in triage blijven
              hangen. Beide triagisten (Stef + dev) volgen dezelfde flow — wie 'm eerst opent en
              bevestigt, claimt 'm.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Issue-list voor/na */}
      <SectionCard
        icon={<Target className="size-5" />}
        title="4. Issue-lijst: badge in plaats van bolletje"
        description="Direct scanbaar — je ziet meteen wat de prio is zonder te raden."
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
            <div>
              <MockIssueRow number={142} title="Login werkt niet meer..." prio="P0" />
              <MockIssueRow number={138} title="PDF-export geeft lege pagina..." prio="P1" />
              <MockIssueRow number={121} title="Filter-dropdown sluit niet..." prio="P2" />
              <MockIssueRow number={118} title="Tooltip te kort op mobile" prio="P3" />
              <MockIssueRow
                number={147}
                title="Knop 'Opslaan' reageert niet op mobile"
                prio="P2"
                unTriaged
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Footer */}
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Niet inbegrepen in deze sprint:</strong> AI suggested
        priority (jouw scope-besluit), DB-migratie van keys (te risicovol), unassigned P0/P1 op
        /mijn-week (open vraag — voorlopig nee). Volledige spec staat in{" "}
        <code>sprints/backlog/DH-012-prioritization-system.md</code>.
      </div>
    </div>
  );
}
