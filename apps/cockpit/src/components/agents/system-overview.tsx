export interface SystemStats {
  activeCount: number;
  buildingCount: number;
  activeNames: string[];
  runsToday: number;
  runs7d: number;
  costToday: number;
  successRate7d: number;
  runsErrorToday: number;
}

export function SystemOverview({ stats }: { stats: SystemStats }) {
  const costLabel =
    stats.costToday < 0.01 ? "< € 0,01" : `€ ${stats.costToday.toFixed(2).replace(".", ",")}`;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Actief</span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{stats.activeCount}</span>
          <span className="text-sm text-muted-foreground">agents</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          + {stats.buildingCount} in ontwikkeling
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Runs vandaag</span>
          {stats.runsErrorToday > 0 ? (
            <span className="text-xs font-medium text-red-600">{stats.runsErrorToday} error</span>
          ) : (
            <span className="text-xs font-medium text-green-600">alles ok</span>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{stats.runsToday}</span>
          <span className="text-sm text-muted-foreground">7d: {stats.runs7d}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">over alle agents</div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Kosten vandaag</span>
          <span className="text-xs text-muted-foreground">USD → EUR approx</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{costLabel}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">op basis van token-usage</div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Success rate 7d</span>
          <span
            className={`text-xs font-medium ${
              stats.successRate7d >= 95
                ? "text-green-600"
                : stats.successRate7d >= 80
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {stats.successRate7d >= 95
              ? "● gezond"
              : stats.successRate7d >= 80
                ? "● wisselend"
                : "● onstabiel"}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{stats.successRate7d}%</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">afgelopen 7 dagen</div>
      </div>
    </div>
  );
}
