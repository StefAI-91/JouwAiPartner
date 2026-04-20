import type { Agent } from "@/app/(dashboard)/agents/_data";
import { quadrantHeader, quadrantBadge, quadrantLabel } from "./quadrant-styles";

export function AgentCardCompact({ agent }: { agent: Agent }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-dashed border-border/60 bg-card transition-all hover:border-border hover:shadow-sm">
      <div
        className={`relative flex items-center gap-3 px-4 py-4 opacity-75 ${quadrantHeader[agent.quadrant]}`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/80 text-2xl shadow-sm">
          {agent.mascot}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">{agent.name}</h3>
          <p className="truncate text-[11px] text-slate-700">
            {agent.role} · {agent.model}
          </p>
        </div>
        <span
          className={`absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${quadrantBadge[agent.quadrant]}`}
        >
          {quadrantLabel[agent.quadrant]}
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs leading-snug text-muted-foreground">{agent.description}</p>
        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Gepland
          </span>
          <span className="text-[11px] text-foreground">{agent.plannedQuarter}</span>
        </div>
      </div>
    </div>
  );
}

export function AddAgentPlaceholder() {
  return (
    <div className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-muted/40 p-8 text-center transition hover:border-border hover:bg-muted/60">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-card text-xl text-muted-foreground">
        +
      </div>
      <div className="text-sm font-medium text-muted-foreground">Nieuwe agent toevoegen</div>
      <div className="mt-1 text-xs text-muted-foreground">Definieer rol, model en quadrant</div>
    </div>
  );
}
