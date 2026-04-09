import { Inbox, ListTodo, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@repo/ui/utils";

interface MetricsGridProps {
  counts: {
    triage: number;
    backlog: number;
    todo: number;
    in_progress: number;
    done: number;
    cancelled: number;
  };
  totalOpen: number;
}

const METRICS = [
  {
    key: "triage" as const,
    label: "Triage",
    icon: Inbox,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    key: "open" as const,
    label: "Open",
    icon: ListTodo,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    key: "in_progress" as const,
    label: "In behandeling",
    icon: Loader2,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    key: "done" as const,
    label: "Afgerond",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
];

export function MetricsGrid({ counts, totalOpen }: MetricsGridProps) {
  const values: Record<string, number> = {
    triage: counts.triage,
    open: totalOpen,
    in_progress: counts.in_progress,
    done: counts.done,
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {METRICS.map((m) => {
        const Icon = m.icon;
        const value = values[m.key] ?? 0;
        return (
          <div key={m.key} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className={cn("rounded-md p-1.5", m.bg)}>
                <Icon className={cn("size-4", m.color)} />
              </div>
              <span className="text-sm text-muted-foreground">{m.label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        );
      })}
    </div>
  );
}
