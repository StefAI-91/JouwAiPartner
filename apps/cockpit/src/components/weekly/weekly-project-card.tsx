"use client";

import { useState } from "react";
import { ChevronDown, Shield, TrendingUp } from "lucide-react";
import { STATUS_CONFIG, type ProjectHealth } from "./weekly-summary-types";

export function WeeklyProjectCard({ project }: { project: ProjectHealth }) {
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
