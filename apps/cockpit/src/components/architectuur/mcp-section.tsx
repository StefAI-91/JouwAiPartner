import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui/accordion";
import { Wrench } from "lucide-react";
import { mcpTools } from "@/app/(dashboard)/architectuur/_data/mcp-tools";

export function McpSection() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Wrench className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">MCP Tools</h2>
          <p className="text-xs text-muted-foreground">
            7 tools beschikbaar via het Model Context Protocol
          </p>
        </div>
      </div>

      {/* What is MCP */}
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
                <code className="rounded bg-muted px-1 font-mono text-[11px]">
                  search_knowledge
                </code>{" "}
                of <code className="rounded bg-muted px-1 font-mono text-[11px]">get_projects</code>
                )
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

      {/* Tool cards */}
      <div className="space-y-3">
        {mcpTools.map((tool) => {
          const ToolIcon = tool.icon;
          return (
            <Card key={tool.name}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <ToolIcon className="h-4 w-4 text-primary" />
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

                {/* Parameters */}
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

                {/* Example questions */}
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
        })}
      </div>
    </div>
  );
}
