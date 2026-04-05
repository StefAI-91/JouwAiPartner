import {
  Sparkles,
  AlertTriangle,
  Users,
  Target,
} from "lucide-react";
import { ProjectHealthCard } from "./project-health-card";
import { formatDate } from "@/lib/date-utils";

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

export function WeeklySummaryView({ data, createdAt }: WeeklySummaryViewProps) {
  const redCount = data.project_health.filter((p) => p.status === "rood").length;
  const orangeCount = data.project_health.filter((p) => p.status === "oranje").length;
  const greenCount = data.project_health.filter((p) => p.status === "groen").length;

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{formatDate(data.week_start)} – {formatDate(data.week_end)}</span>
        <span className="text-foreground/30">|</span>
        <span>{data.project_health.length} projecten</span>
        {redCount > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
            {redCount} risico
          </span>
        )}
        {orangeCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            {orangeCount} aandacht
          </span>
        )}
        {greenCount > 0 && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            {greenCount} op koers
          </span>
        )}
      </div>

      {/* Management summary */}
      <section className="rounded-xl bg-[#006B3F]/[0.03] px-6 py-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-[#006B3F]/60" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            Management Overzicht
          </h2>
          <span className="text-[10px] text-muted-foreground/55">
            gegenereerd {formatDate(createdAt)}
          </span>
        </div>
        <p className="text-[15px] leading-relaxed text-foreground/85">
          {data.management_summary}
        </p>
      </section>

      {/* Project health grid */}
      {data.project_health.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground/80 mb-3">Projectstatus</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {data.project_health.map((project) => (
              <ProjectHealthCard key={project.project_id} project={project} />
            ))}
          </div>
        </section>
      )}

      {/* Cross-project risks */}
      {data.cross_project_risks.length > 0 && (
        <section className="rounded-xl border border-red-100 bg-red-50/50 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500/70" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-700/70">
              Cross-project risico&apos;s
            </h2>
          </div>
          <ul className="space-y-1.5">
            {data.cross_project_risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <span className="text-[13px] text-foreground/75">{risk}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Team insights */}
      {data.team_insights.length > 0 && (
        <section className="rounded-xl border border-blue-100 bg-blue-50/30 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-3.5 w-3.5 text-blue-500/70" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-700/70">
              Team inzichten
            </h2>
          </div>
          <ul className="space-y-1.5">
            {data.team_insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span className="text-[13px] text-foreground/75">{insight}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Focus next week */}
      {data.focus_next_week.length > 0 && (
        <section className="rounded-xl border border-[#006B3F]/10 bg-[#006B3F]/[0.02] px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3.5 w-3.5 text-[#006B3F]/60" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
              Focus volgende week
            </h2>
          </div>
          <ol className="space-y-1.5">
            {data.focus_next_week.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#006B3F]/10 text-[10px] font-bold text-[#006B3F]/60">
                  {i + 1}
                </span>
                <span className="text-[13px] text-foreground/75">{item}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
