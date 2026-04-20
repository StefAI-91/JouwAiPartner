import type { SystemStats } from "@/app/(dashboard)/agents/_data";

export function SystemOverview({ stats }: { stats: SystemStats }) {
  const runsDelta = Math.round(
    ((stats.runsToday - stats.runsYesterday) / stats.runsYesterday) * 100,
  );
  const budgetPercent = Math.round((stats.costToday / stats.costBudget) * 100);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Actief nu</span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{stats.activeCount}</span>
          <span className="text-sm text-muted-foreground">/ {stats.totalCount} agents</span>
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">
          {stats.activeNames.join(" · ")}
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Runs vandaag</span>
          <span
            className={`text-xs font-medium ${runsDelta >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {runsDelta >= 0 ? "↑" : "↓"} {Math.abs(runsDelta)}%
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{stats.runsToday}</span>
          <span className="text-sm text-muted-foreground">gisteren {stats.runsYesterday}</span>
        </div>
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="bg-blue-500" style={{ width: "47%" }} />
          <div className="bg-blue-400" style={{ width: "23%" }} />
          <div className="bg-violet-500" style={{ width: "30%" }} />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Kosten vandaag</span>
          <span className="text-xs text-muted-foreground">budget €{stats.costBudget}/dag</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold">
            €{stats.costToday.toFixed(2).replace(".", ",")}
          </span>
          <span className="text-sm text-muted-foreground">van €{stats.costBudget}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-600"
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Gezondheid</span>
          <span className="text-xs font-medium text-green-600">● alles goed</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{stats.uptimePercent}%</span>
          <span className="text-sm text-muted-foreground">uptime 7d</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">Geen incidenten deze week</div>
      </div>
    </div>
  );
}
