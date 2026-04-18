import { AlertTriangle } from "lucide-react";
import type { WorkspaceParsedItem } from "@/components/projects/workspace/types";
import { PanelCard, PanelEmpty, SourceLink } from "./panel-card";

interface RisksPanelProps {
  items: WorkspaceParsedItem[];
}

export function RisksPanel({ items }: RisksPanelProps) {
  return (
    <PanelCard
      title="Risico's"
      icon={AlertTriangle}
      iconBgClassName="bg-destructive/10"
      iconClassName="text-destructive"
      meta={items.length > 0 ? `${items.length}` : undefined}
    >
      {items.length === 0 ? (
        <PanelEmpty>Geen risico&apos;s gedetecteerd in recente meetings.</PanelEmpty>
      ) : (
        items.map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm leading-relaxed text-foreground/90">{item.content}</p>
              <div className="flex items-center gap-2">
                {item.theme && (
                  <span className="text-[11px] text-muted-foreground">{item.theme}</span>
                )}
                <SourceLink meeting={item.source_meeting} />
              </div>
            </div>
          </div>
        ))
      )}
    </PanelCard>
  );
}
