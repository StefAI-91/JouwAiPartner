"use client";

import { Sparkles, AlertTriangle, Users, Target, Calendar } from "lucide-react";
import { formatDate } from "@repo/ui/format";
import { formatWeekRange, getWeekNumber } from "@/lib/weekly";
import type { WeeklySummaryData } from "./weekly-summary-types";
import { WeeklyProjectCard } from "./weekly-project-card";
import { WeeklyFocusItem } from "./weekly-focus-item";
import { WeeklyStatusTiles } from "./weekly-status-tiles";

interface WeeklySummaryViewProps {
  data: WeeklySummaryData;
  createdAt: string;
}

export function WeeklySummaryView({ data, createdAt }: WeeklySummaryViewProps) {
  const redProjects = data.project_health.filter((p) => p.status === "rood");
  const orangeProjects = data.project_health.filter((p) => p.status === "oranje");
  const greenProjects = data.project_health.filter((p) => p.status === "groen");
  const weekNum = getWeekNumber(data.week_start);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="font-heading text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
          Week {weekNum}
        </span>
        <p className="text-lg font-bold leading-tight tracking-tight">
          {formatWeekRange(data.week_start, data.week_end)}
        </p>
      </div>

      <WeeklyStatusTiles red={redProjects} orange={orangeProjects} green={greenProjects} />

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
              <WeeklyProjectCard key={project.project_id} project={project} />
            ))}
          </div>
        </section>
      )}

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
              <WeeklyFocusItem key={i} item={item} index={i} />
            ))}
          </div>
        </section>
      )}

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
