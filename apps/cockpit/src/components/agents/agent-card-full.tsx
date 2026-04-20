import type { Agent } from "@/app/(dashboard)/agents/_data";
import { quadrantHeader, quadrantBadge, quadrantLabel } from "./quadrant-styles";

export function AgentCardFull({ agent }: { agent: Agent }) {
  const isBuilding = agent.status === "building";

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md ${
        isBuilding ? "border-amber-300 ring-1 ring-amber-200" : "border-border/50"
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
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900">{agent.name}</h3>
            <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
              {agent.model}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-700">{agent.role}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            {isBuilding ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="font-medium text-amber-700">Bouwen</span>
                <span className="text-slate-500">· sprint actief</span>
              </>
            ) : (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
                <span className="font-medium text-green-700">Actief</span>
                <span className="text-slate-500">· {agent.lastRunMinutesAgo} min geleden</span>
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
        <p className="text-sm leading-snug text-muted-foreground">{agent.description}</p>

        {isBuilding && agent.sprintProgress ? (
          <div className="mt-4 border-t border-border/50 pt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Voortgang sprint</span>
              <span className="font-semibold">
                {agent.sprintProgress.done} / {agent.sprintProgress.total} taken
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
                style={{
                  width: `${(agent.sprintProgress.done / agent.sprintProgress.total) * 100}%`,
                }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{agent.sprintProgress.eta}</div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/50 pt-4">
            <div>
              <div className="text-xs text-muted-foreground">Runs</div>
              <div className="text-sm font-semibold">{agent.runsToday}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Kosten</div>
              <div className="text-sm font-semibold">
                €{agent.costToday?.toFixed(2).replace(".", ",")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Success</div>
              <div className="text-sm font-semibold text-green-600">{agent.successRate}%</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
