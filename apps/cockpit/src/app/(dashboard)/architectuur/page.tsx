import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { LayerCard } from "@/components/architectuur/layer-card";
import { FlowArrow } from "@/components/architectuur/flow-arrow";
import { EmbeddingsCard } from "@/components/architectuur/embeddings-card";
import { McpSection } from "@/components/architectuur/mcp-section";
import { SeedCard } from "@/components/architectuur/seed-card";
import { RoadmapCard } from "@/components/architectuur/roadmap-card";
import { TestResultsCard } from "@/components/architectuur/test-results-card";
import { layers } from "@/app/(dashboard)/architectuur/_data/layers";

export default function ArchitectuurPage() {
  return (
    <div className="space-y-8">
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
              <LayerCard {...layer} />
              {i < layers.length - 1 && <FlowArrow />}
            </div>
          ))}
        </div>
      </div>

      {/* Embeddings explained */}
      <EmbeddingsCard />

      {/* MCP Tools */}
      <McpSection />

      {/* Seed data */}
      <SeedCard />

      {/* Sprint roadmap */}
      <RoadmapCard />

      {/* Test results */}
      <TestResultsCard />
    </div>
  );
}
