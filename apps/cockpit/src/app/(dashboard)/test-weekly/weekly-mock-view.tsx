"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Users,
  Target,
  ChevronDown,
  Flame,
  Shield,
  TrendingUp,
  Calendar,
} from "lucide-react";

// ─── Mock Data ───

const MOCK_DATA = {
  week_start: "2026-03-30",
  week_end: "2026-04-05",
  generated_at: "2026-04-05T14:30:00Z",
  management_summary:
    "Van de 7 actieve projecten lopen er 3 met concrete voortgang (Booktalk, Fleur op zak, Yasemin), 2 zijn in discovery/strategie-fase (Mecebi, Yasemin), en 3 hebben geen zichtbare activiteit deze week (Cai Studio, HelperU, Ordus). Booktalk bereidt het testpanel van 15 april voor met een kritieke meeting op 7 april. Fleur op zak ligt on hold in afwachting van klantfeedback, maar Ege is inmiddels onboarded. Yasemin heeft acute Shopify-problemen die development blokkeren én een strakke deadline van 15 september.",
  project_health: [
    {
      project_id: "1",
      project_name: "Yasemin",
      status: "rood" as const,
      summary:
        "Project heeft acute blokkade: Shopify-webshop zit vol bugs die development tegenhouden. Stefan Vermaas wordt ingeschakeld als expert. Deadline 15 september nadert.",
      risks: [
        "Acute Shopify-bugs blokkeren alle verdere development",
        "Strakke deadline 15 september terwijl project nog in inventarisatie-fase zit",
        "Afhankelijkheid van externe Shopify-expert Stefan Vermaas",
      ],
      recommendations: [
        "Stefan Vermaas onmiddellijk inschakelen voor Shopify-problemen",
        "Meeting 7 april voorbereiden met concrete planning richting september-deadline",
      ],
    },
    {
      project_id: "2",
      project_name: "Booktalk",
      status: "oranje" as const,
      summary:
        "Testpanel 15 april nadert. Kritieke meeting 7 april 15:30 om materialen en vragenlijsten af te ronden. Voortgang zichtbaar maar tijdsdruk.",
      risks: [
        "Testpanel 15 april zonder voldoende voorbereiding",
        "Afhankelijk van 7 april meeting voor go/no-go",
      ],
      recommendations: [
        "Materialen en vragenlijsten klaarzetten voor 7 april meeting",
        "Back-up plan voor testpanel als voorbereiding onvoldoende is",
      ],
    },
    {
      project_id: "3",
      project_name: "Fleur op zak",
      status: "oranje" as const,
      summary:
        "Project ligt on hold in afwachting van klantfeedback. Ege is onboarded. Salesgesprek status onduidelijk.",
      risks: [
        "Geen klantfeedback ontvangen - project staat stil",
        "Onduidelijke status salesgesprek",
      ],
      recommendations: [
        "Tibor neemt contact op met Fleur over status salesgesprek",
        "Als 9 april niet haalbaar, communiceer nieuwe tijdlijn",
      ],
    },
    {
      project_id: "4",
      project_name: "Mecebi",
      status: "oranje" as const,
      summary:
        "In discovery-fase met Eddy. Strategie moet nog worden uitgeschreven voordat development kan starten.",
      risks: ["Onduidelijke strategie vertraagt development start"],
      recommendations: ["Plan vervolgmeeting met Eddy om strategie uit te schrijven"],
    },
    {
      project_id: "5",
      project_name: "Cai Studio",
      status: "groen" as const,
      summary: "Geen activiteit deze week. Project loopt volgens planning, geen actie nodig.",
      risks: [],
      recommendations: [],
    },
    {
      project_id: "6",
      project_name: "HelperU",
      status: "groen" as const,
      summary: "Geen activiteit deze week. Stabiel project, geen directe aandacht nodig.",
      risks: [],
      recommendations: [],
    },
    {
      project_id: "7",
      project_name: "Ordus",
      status: "groen" as const,
      summary: "Geen activiteit deze week. Loopt op schema.",
      risks: [],
      recommendations: [],
    },
  ],
  cross_project_risks: [
    "Wouter is betrokken bij 5 van 7 projecten — potentieel bottleneck als hij vertraging heeft",
    "Stef en Ege zijn bezig met Fleur op zak onboarding, maar project ligt on hold — onduidelijk of hun tijd optimaal besteed wordt",
    "Voor 3 projecten (Cai Studio, HelperU, Ordus) is geen enkele teamlid zichtbaar actief",
  ],
  team_insights: [
    "Wouter is betrokken bij 5 van 7 projecten (Booktalk, Mecebi, Yasemin meetings + Fleur op zak taak). Dit is een potentieel bottleneck.",
    "Stef en Ege zijn bezig met Fleur op zak onboarding, maar project ligt on hold dus onduidelijk of hun tijd optimaal besteed wordt.",
    "Voor 3 projecten (Cai Studio, HelperU, Ordus) is geen enkele teamlid zichtbaar actief — dit zijn waarschijnlijk vergeten of verkeerd gecategoriseerde projecten.",
  ],
  focus_next_week: [
    "Yasemin: Stefan Vermaas inschakelen voor acute Shopify-bugs, fase nul voorstel presenteren, en meeting 7 april 12:00 uur voorbereiden met concrete planning richting september.",
    "Portfolio-review: bepaal status van Cai Studio, HelperU en Ordus — zijn ze actief, on hold of moeten ze afgesloten? Wijs eigenaren toe die wekelijks updaten.",
    "Booktalk: zorg dat alle materialen en vragenlijsten klaar zijn voor kritieke meeting 7 april 15:30 uur, zodat testpanel 15 april zonder verrassingen kan plaatsvinden.",
    "Fleur op zak: Tibor neemt contact op met Fleur over status salesgesprek en verwachte feedback-datum — als 9 april niet haalbaar is, communiceer nieuwe tijdlijn.",
    "Mecebi: plan vervolgmeeting met Eddy om strategie uit te schrijven en valideer technisch of development haalbaar is met huidige team.",
  ],
};

// ─── Helpers ───

function formatDateNl(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatWeekRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sDay = s.getDate();
  const eDay = e.getDate();
  const sMonth = s.toLocaleDateString("nl-NL", { month: "short" });
  const eMonth = e.toLocaleDateString("nl-NL", { month: "short" });
  if (sMonth === eMonth) {
    return `${sDay} – ${eDay} ${eMonth}`;
  }
  return `${sDay} ${sMonth} – ${eDay} ${eMonth}`;
}

function getWeekNumber(dateStr: string) {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

// ─── Status Config ───

const STATUS_CONFIG = {
  rood: {
    icon: AlertTriangle,
    dot: "bg-red-500",
    bg: "bg-red-50",
    border: "border-red-200/60",
    text: "text-red-700",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    label: "Risico",
    ringHover: "hover:ring-red-200",
  },
  oranje: {
    icon: AlertCircle,
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200/60",
    text: "text-amber-700",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    label: "Aandacht",
    ringHover: "hover:ring-amber-200",
  },
  groen: {
    icon: CheckCircle2,
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200/60",
    text: "text-emerald-700",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    label: "Op koers",
    ringHover: "hover:ring-emerald-200",
  },
};

// ─── Collapsible Project Card ───

function ProjectCard({ project }: { project: (typeof MOCK_DATA.project_health)[0] }) {
  const [open, setOpen] = useState(false);
  const config = STATUS_CONFIG[project.status];
  const hasDetails = project.risks.length > 0 || project.recommendations.length > 0;

  return (
    <div
      className={`group rounded-xl border ${config.border} bg-white ring-1 ring-transparent transition-all duration-200 ${config.ringHover} ${open ? "ring-1 shadow-sm" : ""}`}
    >
      {/* Clickable header */}
      <button
        onClick={() => hasDetails && setOpen(!open)}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${hasDetails ? "cursor-pointer" : "cursor-default"}`}
      >
        {/* Status dot */}
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot} ${project.status === "rood" ? "animate-pulse" : ""}`}
        />

        {/* Name & summary */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-semibold text-foreground">
              {project.project_name}
            </span>
            <span
              className={`rounded-full px-1.5 py-px text-[10px] font-medium ${config.badgeBg} ${config.badgeText}`}
            >
              {config.label}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{project.summary}</p>
        </div>

        {/* Expand indicator */}
        {hasDetails && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Expandable details */}
      {open && hasDetails && (
        <div className={`border-t ${config.border} px-4 py-3 ${config.bg}/30`}>
          <div className="ml-[22px] space-y-3">
            {project.risks.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-600/70">
                  <Shield className="h-3 w-3" />
                  Risico&apos;s
                </p>
                <ul className="space-y-1">
                  {project.risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {project.recommendations.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#006B3F]/70">
                  <TrendingUp className="h-3 w-3" />
                  Aanbevelingen
                </p>
                <ul className="space-y-1">
                  {project.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#006B3F]/40" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Focus Item Card ───

function FocusItem({ item, index }: { item: string; index: number }) {
  // Extract project name (before first colon)
  const colonIdx = item.indexOf(":");
  const projectName = colonIdx > -1 ? item.slice(0, colonIdx) : null;
  const description = colonIdx > -1 ? item.slice(colonIdx + 1).trim() : item;
  const isUrgent = index === 0;

  return (
    <div
      className={`flex gap-3 rounded-xl border px-4 py-3.5 transition-all ${
        isUrgent ? "border-red-200/60 bg-red-50/40" : "border-border/50 bg-white"
      }`}
    >
      {/* Number badge */}
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
          isUrgent ? "bg-red-100 text-red-700" : "bg-[#006B3F]/8 text-[#006B3F]/70"
        }`}
      >
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        {projectName && (
          <span
            className={`text-xs font-semibold ${isUrgent ? "text-red-700" : "text-foreground/80"}`}
          >
            {projectName}
          </span>
        )}
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>

      {isUrgent && <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />}
    </div>
  );
}

// ─── Main View ───

export function WeeklyMockView() {
  const data = MOCK_DATA;

  const redProjects = data.project_health.filter((p) => p.status === "rood");
  const orangeProjects = data.project_health.filter((p) => p.status === "oranje");
  const greenProjects = data.project_health.filter((p) => p.status === "groen");

  const weekNum = getWeekNumber(data.week_start);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-6">
      {/* ─── Header ─── */}
      <div className="mb-6">
        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-2 text-center">
              <span className="font-heading text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                Week {weekNum}
              </span>
              <h1 className="text-lg font-bold leading-tight tracking-tight">
                {formatWeekRange(data.week_start, data.week_end)}
              </h1>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/30 transition-colors"
              disabled
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#006B3F] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#005a35]">
            <RefreshCw className="h-3.5 w-3.5" />
            Genereren
          </button>
        </div>
      </div>

      {/* ─── Status Tiles ─── */}
      <div className="mb-6 grid grid-cols-3 gap-2.5">
        {/* Risico tile */}
        <div className="flex flex-col items-center rounded-xl border border-red-200/50 bg-red-50/50 py-3">
          <span className="font-heading text-2xl font-bold text-red-600">{redProjects.length}</span>
          <span className="mt-0.5 text-[11px] font-medium text-red-600/70">Risico</span>
          <div className="mt-1.5 flex gap-1">
            {redProjects.map((p) => (
              <span
                key={p.project_id}
                className="rounded-full bg-red-100 px-1.5 py-px text-[9px] font-medium text-red-700"
              >
                {p.project_name}
              </span>
            ))}
          </div>
        </div>

        {/* Aandacht tile */}
        <div className="flex flex-col items-center rounded-xl border border-amber-200/50 bg-amber-50/50 py-3">
          <span className="font-heading text-2xl font-bold text-amber-600">
            {orangeProjects.length}
          </span>
          <span className="mt-0.5 text-[11px] font-medium text-amber-600/70">Aandacht</span>
          <div className="mt-1.5 flex flex-wrap justify-center gap-1">
            {orangeProjects.map((p) => (
              <span
                key={p.project_id}
                className="rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-medium text-amber-700"
              >
                {p.project_name}
              </span>
            ))}
          </div>
        </div>

        {/* Op koers tile */}
        <div className="flex flex-col items-center rounded-xl border border-emerald-200/50 bg-emerald-50/50 py-3">
          <span className="font-heading text-2xl font-bold text-emerald-600">
            {greenProjects.length}
          </span>
          <span className="mt-0.5 text-[11px] font-medium text-emerald-600/70">Op koers</span>
          <div className="mt-1.5 flex flex-wrap justify-center gap-1">
            {greenProjects.map((p) => (
              <span
                key={p.project_id}
                className="rounded-full bg-emerald-100 px-1.5 py-px text-[9px] font-medium text-emerald-700"
              >
                {p.project_name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Management Summary ─── */}
      <section className="mb-6 rounded-xl bg-[#006B3F]/[0.03] px-5 py-4 ring-1 ring-[#006B3F]/[0.06]">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#006B3F]/50" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#006B3F]/60">
              AI Samenvatting
            </h2>
          </div>
          <span className="text-[10px] text-muted-foreground/50">
            {formatDateNl(data.generated_at)}
          </span>
        </div>
        <p className="text-[13px] leading-[1.7] text-foreground/80">{data.management_summary}</p>
      </section>

      {/* ─── Project Health ─── */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-foreground/80">Projectstatus</h2>
          <span className="text-[11px] text-muted-foreground/50">
            {data.project_health.length} projecten
          </span>
        </div>

        {/* Sorted: red first, then orange, then green */}
        <div className="space-y-2">
          {[...redProjects, ...orangeProjects, ...greenProjects].map((project) => (
            <ProjectCard key={project.project_id} project={project} />
          ))}
        </div>
      </section>

      {/* ─── Two-column: Risks + Team ─── */}
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        {/* Cross-project risks */}
        {data.cross_project_risks.length > 0 && (
          <section className="rounded-xl border border-red-100/80 bg-gradient-to-b from-red-50/60 to-white px-4 py-4">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-100">
                <AlertTriangle className="h-3 w-3 text-red-500" />
              </div>
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-red-700/60">
                Cross-project risico&apos;s
              </h2>
            </div>
            <ul className="space-y-2">
              {data.cross_project_risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-300" />
                  <span className="text-xs leading-relaxed text-foreground/70">{risk}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Team insights */}
        {data.team_insights.length > 0 && (
          <section className="rounded-xl border border-blue-100/80 bg-gradient-to-b from-blue-50/50 to-white px-4 py-4">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100">
                <Users className="h-3 w-3 text-blue-500" />
              </div>
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-blue-700/60">
                Team inzichten
              </h2>
            </div>
            <ul className="space-y-2">
              {data.team_insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-300" />
                  <span className="text-xs leading-relaxed text-foreground/70">{insight}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* ─── Focus Next Week ─── */}
      {data.focus_next_week.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#006B3F]/8">
              <Target className="h-3 w-3 text-[#006B3F]/60" />
            </div>
            <h2 className="font-heading text-sm font-semibold text-foreground/80">
              Focus volgende week
            </h2>
          </div>
          <div className="space-y-2">
            {data.focus_next_week.map((item, i) => (
              <FocusItem key={i} item={item} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Footer meta ─── */}
      <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/40">
        <Calendar className="h-3 w-3" />
        <span>
          Gegenereerd op {formatDateNl(data.generated_at)} • Op basis van{" "}
          {data.project_health.length} projecten
        </span>
      </div>
    </div>
  );
}
