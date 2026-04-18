import { CheckCircle2 } from "lucide-react";
import type { WorkspaceParsedItem } from "@/components/projects/workspace/types";
import { PanelCard, PanelEmpty, SourceLink } from "./panel-card";

interface DecisionsPanelProps {
  items: WorkspaceParsedItem[];
}

export function DecisionsPanel({ items }: DecisionsPanelProps) {
  return (
    <PanelCard
      title="Besluiten"
      icon={CheckCircle2}
      iconBgClassName="bg-green-50"
      iconClassName="text-green-700"
      meta={items.length > 0 ? `${items.length}` : undefined}
    >
      {items.length === 0 ? (
        <PanelEmpty>Nog geen besluiten vastgelegd voor dit project.</PanelEmpty>
      ) : (
        items.map((item, i) => (
          <div key={i} className="space-y-1">
            <p className="text-sm leading-relaxed text-foreground/90">
              <span className="text-green-700">✓</span> {item.content}
            </p>
            <div className="flex items-center gap-2 pl-5">
              {item.theme && (
                <span className="text-[11px] text-muted-foreground">{item.theme}</span>
              )}
              <SourceLink meeting={item.source_meeting} />
            </div>
          </div>
        ))
      )}
    </PanelCard>
  );
}
