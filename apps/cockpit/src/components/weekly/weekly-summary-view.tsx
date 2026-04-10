"use client";

import { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  Users,
  Target,
  ChevronDown,
  Flame,
  Shield,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatDate } from "@repo/ui/format";
import { formatWeekRange, getWeekNumber } from "@/lib/weekly";

// ─── Types ───

interface ProjectHealth {
  project_id: string;
  project_name: string;
  status: "groen" | "oranje" | "rood";
  summary: string;
  risks: string[];
  recommendations: string[];
}

interface WeeklySummaryData {
  week_start: string;
  week_end: string;
  management_summary: string;
  project_health: ProjectHealth[];
  cross_project_risks: string[];
  team_insights: string[];
  focus_next_week: string[];
}

interface WeeklySummaryViewProps {
  data: WeeklySummaryData;
  createdAt: string;
}

// ─── Status Config ───

const STATUS_CONFIG = {
  rood: {
    icon: AlertTriangle,
    dot: "bg-red-500",
    border: "border-red-200/60",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    label: "Risico",
    ringHover: "hover:ring-red-200",
    expandBg: "bg-red-50/30",
  },
  oranje: {
    icon: AlertCircle,
    dot: "bg-amber-500",
    border: "border-amber-200/60",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    label: "Aandacht",
    ringHover: "hover:ring-amber-200",
    expandBg: "bg-amber-50/30",
  },
  groen: {
    icon: CheckCircle2,
    dot: "bg-emerald-500",
    border: "border-emerald-200/60",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    label: "Op koers",
    ringHover: "hover:ring-emerald-200",
    expandBg: "bg-emerald-50/30",
  },
};

// ─── Collapsible Project Card ───

function ProjectCard({ project }: { project: ProjectHealth }) {
  const [open, setOpen] = useState(false);
  const config = STATUS_CONFIG[project.status];
  const hasDetails = project.risks.length > 0 || project.recommendations.length > 0;

  return (
    <div
      className={`group rounded-xl border ${config.border} bg-white ring-1 ring-transparent transition-all duration-200 ${config.ringHover} ${open ? "ring-1 shadow-sm" : ""}`}
    >
      <button
        onClick={() => hasDetails && setOpen(!open)}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${hasDetails ? "cursor-pointer" : "cursor-default"}`}
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot} ${project.status === "rood" ? "animate-pulse" : ""}`}
        />
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
        {hasDetails && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && hasDetails && (
        <div className={`border-t ${config.border} px-4 py-3 ${config.expandBg}`}>
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

export function WeeklySummaryView({ data, createdAt }: WeeklySummaryViewProps) {
  const redProjects = data.project_health.filter((p) => p.status === "rood");
  const orangeProjects = data.project_health.filter((p) => p.status === "oranje");
  const greenProjects = data.project_health.filter((p) => p.status === "groen");
  const weekNum = getWeekNumber(data.week_start);

  return (
    <div className="space-y-6">
      {/* ─── Week label ─── */}
      <div className="text-center">
        <span className="font-heading text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
          Week {weekNum}
        </span>
        <p className="text-lg font-bold leading-tight tracking-tight">
          {formatWeekRange(data.week_start, data.week_end)}
        </p>
      </div>

      {/* ─── Status Tiles ─── */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="flex flex-col items-center rounded-xl border border-red-200/50 bg-red-50/50 py-3">
          <span className="font-heading text-2xl font-bold text-red-600">{redProjects.length}</span>
          <span className="mt-0.5 text-[11px] font-medium text-red-600/70">Risico</span>
          <div className="mt-1.5 flex flex-wrap justify-center gap-1">
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

      {/* ─── AI Summary ─── */}
      <section className="rounded-xl bg-[#006B3F]/[0.03] px-5 py-4 ring-1 ring-[#006B3F]/[0.06]">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#006B3F]/50" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#006B3F]/60">
              AI Samenvatting
            </h2>
          </div>
          <span className="text-[10px] text-muted-foreground/50">{formatDate(createdAt)}</span>
        </div>
        <p className="text-[13px] leading-[1.7] text-foreground/80">{data.management_summary}</p>
      </section>

      {/* ─── Project Health ─── */}
      {data.project_health.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-foreground/80">Projectstatus</h2>
            <span className="text-[11px] text-muted-foreground/50">
              {data.project_health.length} projecten
            </span>
          </div>
          <div className="space-y-2">
            {[...redProjects, ...orangeProjects, ...greenProjects].map((project) => (
              <ProjectCard key={project.project_id} project={project} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Two-column: Risks + Team ─── */}
      <div className="grid gap-3 md:grid-cols-2">
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

      {/* ─── Footer ─── */}
      <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-muted-foreground/40">
        <Calendar className="h-3 w-3" />
        <span>
          Gegenereerd op {formatDate(createdAt)} · Op basis van {data.project_health.length}{" "}
          projecten
        </span>
      </div>
    </div>
  );
}
