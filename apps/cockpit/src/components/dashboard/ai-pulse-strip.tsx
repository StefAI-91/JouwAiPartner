import { Brain, Lightbulb, Timer, Sparkles } from "lucide-react";
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
    key: "decisions" as const,
    icon: Lightbulb,
    format: (d: AiPulseData) =>
      d.recentDecisions > 0
        ? `${d.recentDecisions} besluit${d.recentDecisions !== 1 ? "en" : ""} vastgelegd`
        : "Geen nieuwe besluiten",
  },
  {
    key: "deadlines" as const,
    icon: Timer,
    format: (d: AiPulseData) =>
      d.upcomingDeadlines > 0
        ? `${d.upcomingDeadlines} deadline${d.upcomingDeadlines !== 1 ? "s" : ""} komende week`
        : "Geen deadlines komende week",
  },
  {
    key: "needs" as const,
    icon: Sparkles,
    format: (d: AiPulseData) =>
      d.openNeeds > 0
        ? `${d.openNeeds} openstaande behoefte${d.openNeeds !== 1 ? "n" : ""}`
        : "Geen openstaande behoeften",
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
