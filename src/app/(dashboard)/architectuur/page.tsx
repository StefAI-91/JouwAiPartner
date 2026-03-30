import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { layers, mcpTools, seedSection, roadmapItems, testResults } from "@/lib/data/architectuur";
import { LayerCard } from "@/components/architectuur/layer-card";
import { ToolCard } from "@/components/architectuur/tool-card";
import { StatusBadge } from "@/components/architectuur/status-badge";
import { FlowArrow } from "@/components/architectuur/flow-arrow";
import { EmbeddingsCard } from "@/components/architectuur/embeddings-card";
import { McpExplainerCard } from "@/components/architectuur/mcp-explainer-card";

export default function ArchitectuurPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      {/* Header */}
      <div>
        <h1>Hoe het platform werkt</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Van meeting-opname tot doorzoekbare kennisbasis. Klik op &quot;Technische details&quot;
          voor de diepere uitleg.
        </p>
      </div>

      {/* How it works — simple overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Het idee in 30 seconden</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">
            Jullie voeren meetings via Fireflies. Het platform pakt automatisch het transcript op,
            laat AI de meeting classificeren en de belangrijkste punten eruit halen (besluiten,
            actiepunten, inzichten), en slaat alles doorzoekbaar op. Daarna kan iedereen in het team
            vragen stellen zoals <em>&quot;Wat hebben we besloten over Ordus?&quot;</em> of{" "}
            <em>&quot;Welke actiepunten staan open voor Stef?&quot;</em> en krijgt direct antwoord
            met bronverwijzing.
          </p>
        </CardContent>
      </Card>

      {/* Data flow — layer by layer */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Dataflow: van bron tot zoekresultaat</h2>
        <div className="space-y-0">
          {layers.map((layer, i) => (
            <div key={layer.title}>
              <LayerCard layer={layer} />
              {i < layers.length - 1 && <FlowArrow />}
            </div>
          ))}
        </div>
      </div>

      {/* Embeddings explained */}
      <EmbeddingsCard />

      {/* MCP Tools */}
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
        <McpExplainerCard />
        <div className="space-y-3">
          {mcpTools.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </div>
      </div>

      {/* Seed data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voorgeladen data</CardTitle>
          <CardDescription>{seedSection.simpleExplanation}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {seedSection.data.map((group) => (
              <div
                key={group.category}
                className="rounded-lg border border-border/50 bg-muted/30 p-3"
              >
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{group.category}</p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item} className="text-xs text-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sprint roadmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roadmap</CardTitle>
          <CardDescription>Wat is af, wat komt er nog?</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {roadmapItems.map((item) => (
              <li key={item.sprint} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {item.sprint.split(" ")[1]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.title}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Test results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test resultaten</CardTitle>
          <CardDescription>Live getest op de preview branch</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {testResults.map((item) => (
              <li key={item.test} className="flex items-start gap-2">
                <span className={`mt-0.5 text-xs ${item.pass ? "text-green-600" : "text-red-500"}`}>
                  {item.pass ? "\u2713" : "\u2717"}
                </span>
                <div>
                  <span className="text-sm font-medium">{item.test}</span>
                  <p className="text-xs text-muted-foreground">{item.result}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
