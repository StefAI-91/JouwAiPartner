import { Users, Sparkles } from "lucide-react";
import { PanelCard } from "./panel-card";

export function WaitingPlaceholder() {
  return (
    <PanelCard
      title="Wie wacht op wie"
      icon={Users}
      iconBgClassName="bg-secondary"
      iconClassName="text-foreground"
    >
      <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed bg-muted/30 p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="size-3" />
          Volgende sprint
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Dit paneel wordt gevuld in PW-02 (commitments-extractie). Dan zien we per persoon wie op
          wie wacht en hoe lang.
        </p>
      </div>
    </PanelCard>
  );
}
