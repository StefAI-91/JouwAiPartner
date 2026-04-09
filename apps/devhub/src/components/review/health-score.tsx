import { cn } from "@repo/ui/utils";
import { Activity, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface HealthScoreProps {
  score: number;
  label: string;
  summary: string;
}

const HEALTH_CONFIG: Record<
  string,
  { icon: typeof ShieldCheck; color: string; bg: string; ringColor: string; label: string }
> = {
  healthy: {
    icon: ShieldCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    ringColor: "ring-emerald-200",
    label: "Gezond",
  },
  needs_attention: {
    icon: ShieldAlert,
    color: "text-amber-600",
    bg: "bg-amber-50",
    ringColor: "ring-amber-200",
    label: "Aandacht nodig",
  },
  critical: {
    icon: ShieldX,
    color: "text-red-600",
    bg: "bg-red-50",
    ringColor: "ring-red-200",
    label: "Kritiek",
  },
};

export function HealthScore({ score, label, summary }: HealthScoreProps) {
  const config = HEALTH_CONFIG[label] ?? HEALTH_CONFIG.needs_attention;
  const Icon = config.icon;

  return (
    <div className={cn("rounded-lg border p-5 ring-1", config.ringColor)}>
      <div className="flex items-start gap-4">
        <div className={cn("rounded-lg p-2.5", config.bg)}>
          <Icon className={cn("size-6", config.color)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className={cn("text-3xl font-bold", config.color)}>{score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-sm font-medium",
                config.bg,
                config.color,
              )}
            >
              {config.label}
            </span>
          </div>
          <p className="mt-2 text-base leading-relaxed text-foreground/80">{summary}</p>
        </div>
      </div>
    </div>
  );
}
