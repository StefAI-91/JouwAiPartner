import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function McpExplainerCard() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Wat is MCP?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground">
          MCP (Model Context Protocol) is een standaard waarmee AI-assistenten zoals Claude tools
          kunnen gebruiken. Onze MCP server draait op Vercel en geeft Claude directe toegang tot
          jullie kennisbasis. Claude kan zelf beslissen welke tool het beste past bij je vraag.
        </p>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Hoe werkt het?</p>
          <ol className="space-y-1 text-xs text-muted-foreground">
            <li>1. Je stelt een vraag aan Claude</li>
            <li>
              2. Claude kiest de juiste tool (bijv.{" "}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">search_knowledge</code>{" "}
              of <code className="rounded bg-muted px-1 font-mono text-[11px]">get_projects</code>)
            </li>
            <li>3. De tool bevraagt de database en stuurt resultaten terug</li>
            <li>4. Claude formuleert een antwoord op basis van de resultaten</li>
          </ol>
        </div>
        <Accordion>
          <AccordionItem>
            <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
              Hoe koppel je de MCP server?
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    In Claude.ai (web)
                  </p>
                  <ol className="space-y-0.5 text-xs text-muted-foreground">
                    <li>1. Ga naar Claude.ai &rarr; Settings &rarr; Integrations</li>
                    <li>2. Klik &quot;Add MCP Server&quot;</li>
                    <li>
                      3. Vul de URL in:{" "}
                      <code className="rounded bg-muted px-1 font-mono text-[11px]">
                        [jouw-vercel-url]/api/mcp
                      </code>
                    </li>
                    <li>4. Klaar! Claude kan nu je kennisbasis bevragen</li>
                  </ol>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    In Claude Code (CLI)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Voeg toe aan{" "}
                    <code className="rounded bg-muted px-1 font-mono text-[11px]">
                      .claude.json
                    </code>
                    :
                  </p>
                  <pre className="mt-1 rounded-lg bg-muted p-2 font-mono text-[11px] text-muted-foreground">
                    {`{
  "mcpServers": {
    "kennisbasis": {
      "type": "url",
      "url": "[jouw-vercel-url]/api/mcp"
    }
  }
}`}
                  </pre>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
