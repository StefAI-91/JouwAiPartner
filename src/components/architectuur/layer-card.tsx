import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { type LayerItem, iconMap } from "@/lib/data/architectuur";
import { StatusBadge } from "./status-badge";

interface LayerCardProps {
  layer: LayerItem;
}

export function LayerCard({ layer }: LayerCardProps) {
  const { iconName, title, sprint, status, simpleExplanation, technicalDetails, tables } = layer;
  const Icon = iconMap[iconName];

  return (
    <Card className={status === "gepland" ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              {Icon && <Icon className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">{sprint}</CardDescription>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground">{simpleExplanation}</p>

        {tables && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Tabellen</p>
            <ul className="space-y-1">
              {tables.map((t) => (
                <li key={t} className="text-xs text-muted-foreground">
                  <code className="mr-1 rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                    {t.split(" \u2014 ")[0]}
                  </code>
                  {t.includes(" \u2014 ") && <span>{t.split(" \u2014 ")[1]}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Accordion>
          <AccordionItem>
            <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
              Technische details
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1.5">
                {technicalDetails.map((detail) => (
                  <li key={detail} className="text-xs leading-relaxed text-muted-foreground">
                    <span className="mr-1.5 text-primary/60">&bull;</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
