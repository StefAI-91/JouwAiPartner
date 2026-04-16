import Link from "next/link";
import { Crown } from "lucide-react";
import type { ManagementInsightsOutput } from "@repo/ai/agents/management-insights";

interface ManagementInsightsStripProps {
  insights: ManagementInsightsOutput;
}

export function ManagementInsightsStrip({ insights }: ManagementInsightsStripProps) {
  if (!insights.week_samenvatting_kort) return null;

  return (
    <Link
      href="/intelligence/management"
      className="group flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/[0.03] px-4 py-3 transition-colors hover:border-primary/20 hover:bg-primary/[0.05]"
    >
      <Crown className="mt-0.5 h-4 w-4 shrink-0 text-primary/50" />
      <p className="flex-1 text-sm font-medium leading-relaxed text-foreground/80 group-hover:text-foreground">
        {insights.week_samenvatting_kort}
      </p>
      <span className="shrink-0 text-[10px] font-medium text-primary/60 group-hover:text-primary">
        Details &rarr;
      </span>
    </Link>
  );
}
