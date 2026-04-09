import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui/accordion";
import { Key } from "lucide-react";
import { DataFlowTable } from "@/components/architectuur/security/data-flow-table";
import type { IntegrationFlow } from "@/app/(dashboard)/architectuur/security/_data/integrations";

interface IntegrationCardProps {
  integration: IntegrationFlow;
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const Icon = integration.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{integration.name}</CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {integration.region}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {integration.provider} &mdash; {integration.purpose}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credentials */}
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Key className="h-3 w-3" />
            Credentials
          </p>
          <div className="space-y-1">
            {integration.credentials.map((cred) => (
              <div key={cred.name} className="flex items-center gap-2 text-xs">
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  {cred.name}
                </code>
                <span className="text-muted-foreground">{cred.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data flows */}
        <DataFlowTable
          title="Data die wij versturen"
          direction="out"
          fields={integration.dataOut}
        />
        <DataFlowTable title="Data die wij ontvangen" direction="in" fields={integration.dataIn} />

        <Accordion>
          <AccordionItem>
            <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
              Endpoints &amp; risico&apos;s
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Endpoints</p>
                  <ul className="space-y-1">
                    {integration.endpoints.map((ep) => (
                      <li key={ep} className="text-xs leading-relaxed text-muted-foreground">
                        <code className="mr-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                          {ep.split(" \u2014 ")[0]}
                        </code>
                        {ep.includes(" \u2014 ") && <span>{ep.split(" \u2014 ")[1]}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                    Risico&apos;s
                  </p>
                  <ul className="space-y-1">
                    {integration.risks.map((risk) => (
                      <li key={risk} className="text-xs leading-relaxed text-muted-foreground">
                        <span className="mr-1.5 text-orange-500">&bull;</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
