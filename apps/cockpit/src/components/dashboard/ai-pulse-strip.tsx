import { Brain, ListChecks, Timer } from "lucide-react";
import type { AiPulseData } from "@repo/database/queries/dashboard";

interface AiPulseStripProps {
  data: AiPulseData;
}

const PULSE_ITEMS = [
  {
    key: "processed" as const,
    icon: Brain,
    format: (d: AiPulseData) =>
      d.totalProcessed > 0
        ? `${d.totalProcessed} meeting${d.totalProcessed !== 1 ? "s" : ""} verwerkt deze week`
        : "Geen nieuwe meetings deze week",
  },
  {
    key: "actions" as const,
    icon: ListChecks,
    format: (d: AiPulseData) =>
      d.activeActions > 0
        ? `${d.activeActions} actiepunt${d.activeActions !== 1 ? "en" : ""} vastgelegd`
        : "Geen actiepunten",
  },
  {
    key: "deadlines" as const,
    icon: Timer,
    format: (d: AiPulseData) =>
      d.upcomingDeadlines > 0
        ? `${d.upcomingDeadlines} deadline${d.upcomingDeadlines !== 1 ? "s" : ""} komende week`
        : "Geen deadlines komende week",
  },
];

export function AiPulseStrip({ data }: AiPulseStripProps) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {PULSE_ITEMS.map(({ key, icon: Icon, format }) => (
        <div key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="size-3.5 text-primary/70" />
          <span>{format(data)}</span>
        </div>
      ))}
    </div>
  );
}
