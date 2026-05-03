import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { ArrowDown, Database, Bot, FileCheck, Bell } from "lucide-react";

export function DataFlowDiagram() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hoe de cockpit een fase kent</CardTitle>
        <p className="text-sm text-muted-foreground">
          De fase wordt voorgesteld door AI op basis van inkomende signalen, en bevestigd door een
          mens. Volgt het verification-pattern dat overal geldt.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <FlowStep
            icon={Database}
            title="Signaal binnen"
            description="Meeting geclassificeerd als kickoff, email met getekend voorstel, mijlpaal afgevinkt in DevHub, contract-einde nadert."
            color="blue"
          />
          <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground/50" />
          <FlowStep
            icon={Bot}
            title="AI stelt fase-overgang voor"
            description="Een fase-detector-agent (Haiku) leest het signaal en plaatst een suggestie in de review-queue: project X → fase 4 (Kickoff)."
            color="violet"
          />
          <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground/50" />
          <FlowStep
            icon={FileCheck}
            title="Mens bevestigt"
            description="In review keurt iemand de fase-overgang goed. Optioneel met aanpassing (bv. verschuif kickoff naar volgende week)."
            color="emerald"
          />
          <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground/50" />
          <FlowStep
            icon={Bell}
            title="Cockpit triggert deliverable"
            description="Bij fase-overgang draait een PM Drafter-agent (Sonnet) die het juiste document drafte: kickoff-pack, voorstel, oplever-rapport."
            color="amber"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FlowStep({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: "blue" | "violet" | "emerald" | "amber";
}) {
  const colors: Record<typeof color, { bg: string; text: string; border: string }> = {
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-900",
    },
    violet: {
      bg: "bg-violet-500/10",
      text: "text-violet-600 dark:text-violet-400",
      border: "border-violet-200 dark:border-violet-900",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-900",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-900",
    },
  };
  const c = colors[color];

  return (
    <div className={`flex gap-3 rounded-lg border ${c.border} bg-background p-3`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.bg} ${c.text}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
