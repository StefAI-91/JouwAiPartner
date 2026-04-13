import { cn } from "@repo/ui/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HealthHeroProps {
  score: number;
  label: string;
  summary: string;
  trend: {
    current: number;
    previous: number | null;
    delta: number | null;
  } | null;
}

const HEALTH_CONFIG: Record<
  string,
  { ringColor: string; scoreColor: string; badgeBg: string; badgeText: string; label: string }
> = {
  healthy: {
    ringColor: "stroke-emerald-500",
    scoreColor: "text-emerald-600",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    label: "Gezond",
  },
  needs_attention: {
    ringColor: "stroke-amber-500",
    scoreColor: "text-amber-600",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    label: "Aandacht nodig",
  },
  critical: {
    ringColor: "stroke-red-500",
    scoreColor: "text-red-600",
    badgeBg: "bg-red-50",
    badgeText: "text-red-700",
    label: "Kritiek",
  },
};

// SVG circle: r=40, circumference = 2*pi*40 ≈ 251.3
const CIRCUMFERENCE = 251.3;

export function HealthHero({ score, label, summary, trend }: HealthHeroProps) {
  const config = HEALTH_CONFIG[label] ?? HEALTH_CONFIG.needs_attention;
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-start gap-6">
        {/* Score ring */}
        <div className="relative size-[72px] shrink-0">
          <svg className="-rotate-90" viewBox="0 0 88 88" fill="none">
            <circle cx="44" cy="44" r="40" strokeWidth="5" className="stroke-muted" />
            <circle
              cx="44"
              cy="44"
              r="40"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              className={config.ringColor}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-xl font-bold tabular-nums", config.scoreColor)}>{score}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <h2 className="text-base font-semibold">Project Health</h2>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium",
                config.badgeBg,
                config.badgeText,
              )}
            >
              {config.label}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        </div>

        {/* Trend */}
        {trend?.delta !== null && trend?.delta !== undefined && (
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-1 justify-end">
              {trend.delta > 0 ? (
                <TrendingUp className="size-3.5 text-emerald-500" />
              ) : trend.delta < 0 ? (
                <TrendingDown className="size-3.5 text-amber-500" />
              ) : (
                <Minus className="size-3.5 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-sm font-medium tabular-nums",
                  trend.delta > 0
                    ? "text-emerald-600"
                    : trend.delta < 0
                      ? "text-amber-600"
                      : "text-muted-foreground",
                )}
              >
                {trend.delta > 0 ? "+" : ""}
                {trend.delta}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">vs vorige review</span>
          </div>
        )}
      </div>
    </div>
  );
}
