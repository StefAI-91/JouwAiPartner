"use client";

import { useState } from "react";
import type { AgentDefinition } from "@repo/ai/agents/registry";
import type { AgentMetrics } from "@repo/database/queries/agent-runs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { quadrantHeader, quadrantBadge, quadrantLabel } from "./quadrant-styles";

interface Props {
  agent: AgentDefinition;
  metrics: AgentMetrics | undefined;
  costTodayUsd: number;
  systemPrompt: string;
}

function formatMinutesAgo(iso: string | null): string {
  if (!iso) return "nog geen runs";
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "zojuist";
  if (diffMin < 60) return `${diffMin} min geleden`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.round(hours / 24);
  return `${days} dag${days === 1 ? "" : "en"} geleden`;
}

function formatCost(usd: number): string {
  if (usd === 0) return "—";
  if (usd < 0.01) return "< $0,01";
  return `$${usd.toFixed(2).replace(".", ",")}`;
}

export function AgentCard({ agent, metrics, costTodayUsd, systemPrompt }: Props) {
  const [open, setOpen] = useState(false);

  const isBuilding = agent.status === "building";
  const hasErrored = metrics?.last_run_status === "error";
  const hasNoData = !metrics || metrics.runs_7d === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:shadow-md ${
          isBuilding
            ? "border-amber-300 ring-1 ring-amber-200"
            : hasErrored
              ? "border-red-300 ring-1 ring-red-200"
              : "border-border/50"
        }`}
      >
        {isBuilding && (
          <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />
        )}

        <div
          className={`relative flex items-center gap-4 px-5 py-5 ${quadrantHeader[agent.quadrant]}`}
        >
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl shadow-md ring-4 transition-transform group-hover:-translate-y-0.5 ${
              isBuilding ? "ring-amber-200/60" : "ring-white/60"
            }`}
          >
            {agent.mascot}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-bold text-slate-900">{agent.name}</h3>
              <span className="shrink-0 rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                {agent.modelLabel}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-700">{agent.role}</p>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              {isBuilding ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="font-medium text-amber-700">In ontwikkeling</span>
                </>
              ) : hasNoData ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span className="font-medium text-slate-600">Geen runs nog</span>
                </>
              ) : hasErrored ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="font-medium text-red-700">Laatste run: error</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                  <span className="font-medium text-green-700">Actief</span>
                  <span className="text-slate-500">
                    · {formatMinutesAgo(metrics?.last_run_at ?? null)}
                  </span>
                </>
              )}
            </div>
          </div>
          <span
            className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold ${quadrantBadge[agent.quadrant]}`}
          >
            {quadrantLabel[agent.quadrant]}
          </span>
        </div>

        <div className="px-5 py-4">
          <p className="line-clamp-3 text-sm leading-snug text-muted-foreground">
            {agent.description}
          </p>

          <div className="mt-4 grid grid-cols-4 gap-3 border-t border-border/50 pt-4">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Runs vandaag
              </div>
              <div className="mt-0.5 text-sm font-semibold">{metrics?.runs_today ?? 0}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">7d</div>
              <div className="mt-0.5 text-sm font-semibold">{metrics?.runs_7d ?? 0}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Kosten
              </div>
              <div className="mt-0.5 text-sm font-semibold">{formatCost(costTodayUsd)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Success 7d
              </div>
              <div
                className={`mt-0.5 text-sm font-semibold ${
                  metrics?.success_rate_7d == null
                    ? "text-muted-foreground"
                    : metrics.success_rate_7d >= 95
                      ? "text-green-600"
                      : metrics.success_rate_7d >= 80
                        ? "text-amber-600"
                        : "text-red-600"
                }`}
              >
                {metrics?.success_rate_7d == null ? "—" : `${metrics.success_rate_7d}%`}
              </div>
            </div>
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl">{agent.mascot}</span>
              <span>
                <span className="font-bold">{agent.name}</span>
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · {agent.role}
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-4 overflow-y-auto pr-2">
            <p className="text-sm text-muted-foreground">{agent.description}</p>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-xs">
              <div>
                <span className="font-medium text-foreground">Model: </span>
                <span className="text-muted-foreground">{agent.modelLabel}</span>
                <span className="ml-1 text-muted-foreground">({agent.model})</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Quadrant: </span>
                <span className="text-muted-foreground">{quadrantLabel[agent.quadrant]}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Status: </span>
                <span className="text-muted-foreground">
                  {isBuilding ? "in ontwikkeling" : "live"}
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground">Entrypoint: </span>
                <code className="text-[11px] text-muted-foreground">{agent.entrypoint}</code>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">System prompt</h4>
              <pre className="max-h-[400px] overflow-y-auto rounded-lg bg-muted/40 p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/90">
                {systemPrompt}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
