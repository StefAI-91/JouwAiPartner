import type { WeeklyIssueIntake } from "@repo/database/queries/issues";
import { TrendingUp } from "lucide-react";

interface IssuesIntakeChartProps {
  data: WeeklyIssueIntake[];
}

const NL_MONTH = new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "UTC" });

function formatShort(date: Date): string {
  return `${date.getUTCDate()} ${NL_MONTH.format(date)}`;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${formatShort(start)} – ${formatShort(end)}`;
}

export function IssuesIntakeChart({ data }: IssuesIntakeChartProps) {
  const total = data.reduce((sum, w) => sum + w.count, 0);
  const max = Math.max(1, ...data.map((w) => w.count));

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Issues binnengekomen per week</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        {total} issues in de afgelopen {data.length} weken
      </p>

      <div className="flex gap-1.5 h-32">
        {data.map((week) => {
          const heightPct = (week.count / max) * 100;
          return (
            <div
              key={week.weekStart}
              className="group relative flex flex-1 flex-col items-center justify-end gap-1"
              title={`${formatWeekRange(week.weekStart)}: ${week.count} issue${week.count === 1 ? "" : "s"}`}
            >
              <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                {week.count > 0 ? week.count : ""}
              </span>
              <div
                className="w-full rounded-t bg-blue-500/70 transition-colors group-hover:bg-blue-500"
                style={{ height: `${Math.max(heightPct, week.count > 0 ? 4 : 0)}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5">
        {data.map((week, i) => (
          <div
            key={week.weekStart}
            className="flex-1 text-center text-[10px] tabular-nums text-muted-foreground"
          >
            {i % 2 === 0 ? formatShort(new Date(`${week.weekStart}T00:00:00Z`)) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
