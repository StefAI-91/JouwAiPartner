import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type ToolInfo, iconMap } from "@/lib/data/architectuur";

interface ToolCardProps {
  tool: ToolInfo;
}

export function ToolCard({ tool }: ToolCardProps) {
  const Icon = iconMap[tool.iconName];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm font-semibold">{tool.name}</code>
              <Badge variant="default">Live</Badge>
            </div>
            <CardDescription className="text-xs">{tool.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground">{tool.simpleExplanation}</p>

        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Parameters</p>
          <div className="space-y-1">
            {tool.parameters.map((param) => (
              <div key={param.name} className="flex items-start gap-2 text-xs">
                <code className="mt-0.5 shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  {param.name}
                </code>
                <span className="text-muted-foreground">
                  {param.description}
                  {param.required && <span className="ml-1 text-primary">(verplicht)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Voorbeeldvragen voor Claude
          </p>
          <ul className="space-y-0.5">
            {tool.exampleQuestions.map((q) => (
              <li key={q} className="text-xs italic text-muted-foreground">
                &quot;{q}&quot;
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
