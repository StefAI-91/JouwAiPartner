import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import {
  Calendar,
  Clock,
  Bot,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  FileText,
  Send,
  CalendarPlus,
  Target,
} from "lucide-react";

const triggers = [
  {
    icon: Calendar,
    label: "Event",
    description: "Nieuwe extractie binnen op project met status = discovery",
    color: "blue",
  },
  {
    icon: Clock,
    label: "Cron (vangnet)",
    description: "Nightly: discovery-projecten zonder audit in laatste 7 dagen",
    color: "slate",
  },
];

const outcomes = [
  {
    light: "🔴",
    label: "ROOD",
    rijpheid: "< 50% rijpheid",
    summary: "Te veel gaten — eerst meer ophalen",
    deliverables: [
      { icon: Send, text: "Email-draft met scherpe vragen naar klant" },
      { icon: CalendarPlus, text: "Voorstel voor follow-up meeting (Calendly)" },
    ],
    notify: "Inbox + Slack als > 7 dagen geen contact",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-300 dark:border-rose-900",
    text: "text-rose-700 dark:text-rose-300",
    accent: "bg-rose-500",
  },
  {
    light: "🟡",
    label: "ORANJE",
    rijpheid: "50–75% rijpheid",
    summary: "Bijna er — gerichte vervolgvragen",
    deliverables: [
      { icon: HelpCircle, text: "Focus-vragenlijst voor volgende call" },
      { icon: FileText, text: "Discovery-rapport (intern) bijgewerkt" },
    ],
    notify: "Alleen op project-pagina (geen ruis)",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-300 dark:border-amber-900",
    text: "text-amber-700 dark:text-amber-300",
    accent: "bg-amber-500",
  },
  {
    light: "🟢",
    label: "GROEN",
    rijpheid: "≥ 75% + ≥ 2 datapunten + budget-signaal",
    summary: "Klaar voor voorstel",
    deliverables: [
      { icon: FileText, text: "PRD-draft met expliciete aannames-sectie" },
      { icon: CheckCircle2, text: "Voorstel-draft (scope + prijs + planning)" },
    ],
    notify: "Inbox: 'Project X klaar voor voorstel — review concept' + Slack",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-300 dark:border-emerald-900",
    text: "text-emerald-700 dark:text-emerald-300",
    accent: "bg-emerald-500",
  },
];

const dimensions = [
  "Probleem",
  "Gebruikers",
  "Success criteria",
  "Scope (in/uit)",
  "Constraints",
  "Budget",
  "Timeline",
  "Stakeholders",
];

export function ScopeAuditFlow() {
  return (
    <Card className="border-violet-200 dark:border-violet-900">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
            <Target className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-base">
              Zoom-in: van Discovery → Sales (state machine)
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Hoe de cockpit beslist of een project rijp is voor een voorstel — event-gedreven met
              cron als vangnet.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* TRIGGERS → AUDITOR */}
        <section>
          <SectionLabel>1. Trigger → Auditor</SectionLabel>
          <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1.2fr]">
            <div className="space-y-3">
              {triggers.map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.label} className="flex gap-3 rounded-xl border bg-muted/30 p-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        t.color === "blue"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.label}</div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden items-center justify-center lg:flex">
              <div className="flex flex-col items-center text-muted-foreground/60">
                <ArrowRight className="h-5 w-5" />
                <span className="mt-1 text-[10px] uppercase tracking-wider">enqueue</span>
              </div>
            </div>

            <div className="rounded-xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-transparent p-4 dark:border-violet-900 dark:from-violet-950/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                    Scope Auditor
                  </div>
                  <p className="text-xs text-muted-foreground">Sonnet 4.6 — high effort</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-foreground/80">
                Scoort rijpheid per dimensie (0–100%) en lijst aannames + open vragen.
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {dimensions.map((d) => (
                  <span
                    key={d}
                    className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* OUTCOMES */}
        <section>
          <SectionLabel>2. Bevinding → drie routes</SectionLabel>
          <div className="grid gap-4 md:grid-cols-3">
            {outcomes.map((o) => (
              <div
                key={o.label}
                className={`flex flex-col rounded-xl border-2 ${o.border} ${o.bg} overflow-hidden`}
              >
                <div className={`${o.accent} px-4 py-2 text-sm font-bold text-white`}>
                  <span className="mr-2">{o.light}</span>
                  {o.label}
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Drempel
                    </div>
                    <div className={`mt-0.5 text-xs font-medium ${o.text}`}>{o.rijpheid}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{o.summary}</div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Deliverables
                    </div>
                    <ul className="mt-1.5 space-y-1.5">
                      {o.deliverables.map((d) => {
                        const Icon = d.icon;
                        return (
                          <li
                            key={d.text}
                            className="flex gap-2 text-xs leading-relaxed text-foreground/90"
                          >
                            <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${o.text}`} />
                            <span>{d.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-background/60 p-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Notificatie
                    </div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-foreground/80">
                      {o.notify}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LOOP + PROMOTION */}
        <section>
          <SectionLabel>3. Loop + promotion</SectionLabel>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-semibold">Bij rood/oranje: terug naar trigger</div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Volgende meeting/email triggert automatisch een nieuwe audit. Geen handmatige
                herstart. Loop blijft draaien tot groen of project handmatig afgesloten.
              </p>
            </div>
            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Bij groen: PM bevestigt overgang
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                Auditor stelt voor:{" "}
                <code className="rounded bg-emerald-100 px-1 py-0.5 font-mono text-[10px] dark:bg-emerald-900/40">
                  status: discovery → sales
                </code>
                . PM keurt goed in review-queue (verification-pattern). Pas na bewezen accuraatheid
                tieren we naar auto-promotion.
              </p>
            </div>
          </div>
        </section>

        {/* THRESHOLDS / KALIBRATIE */}
        <section className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40 p-4 dark:border-violet-900 dark:bg-violet-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">
                Kalibratie — de échte ontwerp-keuze
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">
                  Dubbele drempel om vals-positief te voorkomen:
                </strong>{" "}
                groen vereist niet alleen ≥ 75% rijpheid, maar óók ≥ 2 datapunten en een
                budget-signaal. Eén perfect transcript na de eerste call is verdacht — de auditor
                houdt het dan op oranje.
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Drempels staan per projecttype in de DB (vast bedrag-project = strenger, T&M-project
                = losser). Zo blijft de logica configureerbaar zonder code-wijziging.
              </p>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}
