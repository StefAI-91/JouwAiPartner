import { cn } from "@repo/ui/utils";
import { CircleDot, ShieldAlert, Inbox } from "lucide-react";

interface DashboardMetricsProps {
  openCount: number;
  totalCount: number;
  criticalUnassignedCount: number;
  triageCount: number;
}

export function DashboardMetrics({
  openCount,
  totalCount,
  criticalUnassignedCount,
  triageCount,
}: DashboardMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Open Issues */}
      <div className="rounded-lg border bg-card px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <CircleDot className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Open Issues
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums">{openCount}</span>
          <span className="text-sm text-muted-foreground">van {totalCount}</span>
        </div>
      </div>

      {/* Critical unassigned */}
      <div
        className={cn(
          "rounded-lg border bg-card px-5 py-4",
          criticalUnassignedCount > 0 && "border-amber-300",
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert
            className={cn(
              "size-4",
              criticalUnassignedCount > 0 ? "text-amber-500" : "text-muted-foreground",
            )}
          />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Kritiek zonder assignee
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-2xl font-bold tabular-nums",
              criticalUnassignedCount > 0 && "text-amber-600",
            )}
          >
            {criticalUnassignedCount}
          </span>
          {criticalUnassignedCount > 0 && (
            <span className="text-sm text-amber-600/70">actie vereist</span>
          )}
        </div>
      </div>

      {/* In Triage */}
      <div className="rounded-lg border bg-card px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Inbox className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            In Triage
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums">{triageCount}</span>
          <span className="text-sm text-muted-foreground">wacht op review</span>
        </div>
      </div>
    </div>
  );
}
