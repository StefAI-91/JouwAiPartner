import { Clock } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { formatDateShort } from "@repo/ui/format";
import type { WorkspaceActionItem } from "@repo/database/queries/project-workspace";
import { PanelCard, PanelEmpty, SourceLink } from "./panel-card";

interface WaitingClientPanelProps {
  items: WorkspaceActionItem[];
}

export function WaitingClientPanel({ items }: WaitingClientPanelProps) {
  return (
    <PanelCard
      title="Wachten op klant"
      icon={Clock}
      iconBgClassName="bg-amber-50"
      iconClassName="text-amber-700"
      meta={items.length > 0 ? `${items.length}` : undefined}
    >
      {items.length === 0 ? (
        <PanelEmpty>Niets openstaand bij externe partijen.</PanelEmpty>
      ) : (
        items.map((item) => {
          const deadline = item.deadline ?? item.suggested_deadline;
          return (
            <div key={item.id} className="rounded-lg border border-amber-200/40 bg-amber-50/30 p-3">
              <p className="text-sm font-medium leading-snug text-foreground">{item.content}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {item.follow_up_contact && (
                  <Badge variant="outline" className="text-[10px]">
                    opvolgen bij: {item.follow_up_contact}
                  </Badge>
                )}
                {deadline && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Clock className="size-2.5" />
                    {formatDateShort(deadline)}
                  </Badge>
                )}
                <SourceLink meeting={item.source_meeting} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ActionChip label="Toewijzen" />
                <ActionChip label="Draft mail" />
                <ActionChip label="Markeer opgelost" />
              </div>
            </div>
          );
        })
      )}
    </PanelCard>
  );
}

function ActionChip({ label }: { label: string }) {
  return (
    <span
      className="cursor-not-allowed rounded-md border bg-background px-2 py-1 text-[11px] text-muted-foreground"
      title="Komt in PW-03 (Orchestrator)"
    >
      {label}
    </span>
  );
}
