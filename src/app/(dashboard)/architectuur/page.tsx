import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Database,
  Search,
  Brain,
  Mic,
  ArrowDown,
  Layers,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LayerProps {
  icon: LucideIcon;
  title: string;
  sprint: string;
  status: "live" | "gepland";
  simpleExplanation: string;
  technicalDetails: string[];
  tables?: string[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const layers: LayerProps[] = [
  {
    icon: Mic,
    title: "Bronnen",
    sprint: "Sprint 4-5",
    status: "gepland",
    simpleExplanation:
      "Fireflies neemt meetings op en stuurt het transcript automatisch naar ons platform. Later komen hier ook Google Docs, Slack en Gmail bij.",
    technicalDetails: [
      "Fireflies webhook ontvangt POST op /api/webhooks/fireflies",
      "GraphQL API haalt volledige transcript op (titel, deelnemers, zinnen, samenvatting)",
      "Pre-filter: meetings < 2 min of zonder deelnemers worden overgeslagen",
      "Idempotency check op fireflies_id voorkomt dubbele verwerking",
    ],
  },
  {
    icon: Brain,
    title: "AI Verwerking",
    sprint: "Sprint 4-5",
    status: "gepland",
    simpleExplanation:
      "Twee AI-agents verwerken elke meeting. De Gatekeeper classificeert (wat voor meeting is dit?), de Extractor haalt besluiten, actiepunten en inzichten eruit.",
    technicalDetails: [
      "Gatekeeper (Claude Haiku): classificeert meeting_type, party_type, relevance_score (0.0-1.0)",
      "Extractor (Claude Sonnet): haalt decisions, action_items, needs, insights eruit met confidence score",
      "Entity resolution: koppelt genoemde organisaties/projecten aan de database (exact \u2192 alias \u2192 embedding match)",
      "Alles wordt opgeslagen \u2014 niets wordt weggegooid. Onzekere content krijgt lage confidence.",
    ],
  },
  {
    icon: Database,
    title: "Database",
    sprint: "Sprint 1",
    status: "live",
    simpleExplanation:
      "Alle data zit in een PostgreSQL database bij Supabase. Er zijn tabellen voor organisaties, mensen, projecten, meetings en extracties. Elke meeting wordt gekoppeld aan de juiste organisatie, deelnemers en projecten.",
    technicalDetails: [
      "8 tabellen: organizations, people, projects, meetings, extractions, meeting_projects, meeting_participants, profiles",
      "Elke tabel met embedding VECTOR(1024) kolom voor semantisch zoeken",
      "search_vector (TSVECTOR) op meetings en extractions voor full-text search",
      "Triggers updaten search_vector automatisch bij INSERT/UPDATE",
      "embedding_stale flag markeert records die opnieuw geembed moeten worden",
    ],
    tables: [
      "organizations \u2014 klanten, partners, leveranciers (met aliases voor naamherkenning)",
      "people \u2014 teamleden en contactpersonen",
      "projects \u2014 gekoppeld aan organisaties",
      "meetings \u2014 transcripts, samenvattingen, classificaties van Fireflies",
      "extractions \u2014 besluiten, actiepunten, inzichten, behoeften uit meetings",
    ],
  },
  {
    icon: Layers,
    title: "Indexes en Performance",
    sprint: "Sprint 2",
    status: "live",
    simpleExplanation:
      "De database is geoptimaliseerd om snel te zoeken. Er zijn speciale indexen voor zowel betekenis-zoeken (\"vind alles over AI strategie\") als exacte tekst-zoeken (\"het woord 'budget'\").",
    technicalDetails: [
      "HNSW vector indexes op alle embedding kolommen (cosine distance, 1024-dim)",
      "GIN indexes op search_vector kolommen voor full-text search",
      "B-tree indexes op alle foreign keys en veelgebruikte filters",
      "Partial indexes op embedding_stale = TRUE voor de re-embed worker",
      "pg_cron job draait elke 5 minuten om stale embeddings te monitoren",
    ],
  },
  {
    icon: Search,
    title: "Zoeken",
    sprint: "Sprint 2",
    status: "live",
    simpleExplanation:
      "Het platform combineert twee zoekmethoden. Semantisch zoeken begrijpt de betekenis van je vraag. Full-text zoeken vindt exacte woorden. Samen leveren ze de beste resultaten op.",
    technicalDetails: [
      "search_all_content() \u2014 hybride zoeken over meetings + extracties via Reciprocal Rank Fusion (RRF)",
      "RRF combineert vector similarity ranking met full-text ranking in \u00e9\u00e9n score",
      "match_people() \u2014 vind mensen op basis van embedding similarity",
      "match_projects() \u2014 vind projecten op basis van embedding similarity",
      "search_meetings_by_participant() \u2014 meetings van een specifiek persoon + optioneel tekst zoeken",
    ],
  },
];

const embedSection = {
  simpleExplanation:
    "Elke tekst (meeting-samenvatting, persoonsnaam, projectnaam) wordt omgezet in een lijst van 1024 getallen \u2014 een 'embedding'. Teksten die qua betekenis op elkaar lijken, hebben vergelijkbare getallen. Zo kan het systeem zoeken op betekenis in plaats van exacte woorden.",
  technicalDetails: [
    "Model: Cohere embed-v4.0 (1024 dimensies)",
    "inputType: 'search_document' voor opslag, 'search_query' voor zoekopdrachten",
    "Batch embedding: tot 96 teksten per API call",
    "Re-embed worker verwerkt automatisch records met embedding_stale = true",
    "Edge Function (Deno) draait dezelfde logica voor de pg_cron scheduled job",
  ],
};

const seedSection = {
  simpleExplanation:
    "Het systeem is voorgeladen met jullie echte organisaties, teamleden en projecten. Zo kan het platform meteen namen herkennen wanneer ze in meetings voorkomen.",
  data: [
    { category: "Organisaties", items: ["Flowwijs (eigen)", "Ordus (klant)", "Effect op maat (klant)"] },
    { category: "Team", items: ["Stef Banninga", "Wouter van den Heuvel", "Ege", "Tibor", "Kenji", "Myrrh"] },
    { category: "Klanten", items: ["Bart Nelissen (Ordus)", "Fleur Timmerman (Effect op maat)"] },
    { category: "Projecten", items: ["Ordus", "Fleur op zak", "HelperU"] },
  ],
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: "live" | "gepland" }) {
  return (
    <Badge variant={status === "live" ? "default" : "outline"}>
      {status === "live" ? "Live" : "Gepland"}
    </Badge>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-2">
      <ArrowDown className="h-5 w-5 text-muted-foreground/50" />
    </div>
  );
}

function LayerCard({ icon: Icon, title, sprint, status, simpleExplanation, technicalDetails, tables }: LayerProps) {
  return (
    <Card className={status === "gepland" ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
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
              <LayerCard {...layer} />
              {i < layers.length - 1 && <FlowArrow />}
            </div>
          ))}
        </div>
      </div>

      {/* Embeddings explained */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Embeddings: hoe zoeken op betekenis werkt</CardTitle>
              <CardDescription className="text-xs">Sprint 2</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">
            {embedSection.simpleExplanation}
          </p>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Voorbeeld</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              De zin <em>&quot;We moeten het budget verhogen&quot;</em> en{" "}
              <em>&quot;Er is meer geld nodig&quot;</em> hebben totaal andere woorden, maar
              vergelijkbare embeddings. Het systeem begrijpt dat ze hetzelfde bedoelen.
            </p>
          </div>
          <Accordion>
            <AccordionItem>
              <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
                Technische details
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1.5">
                  {embedSection.technicalDetails.map((detail) => (
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

      {/* Seed data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voorgeladen data</CardTitle>
          <CardDescription>
            {seedSection.simpleExplanation}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {seedSection.data.map((group) => (
              <div key={group.category} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {group.category}
                </p>
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
            {[
              { sprint: "Sprint 1", title: "Database tabellen", status: "live" as const, description: "Alle tabellen, relaties en triggers aangemaakt" },
              { sprint: "Sprint 2", title: "Indexes, zoeken en embeddings", status: "live" as const, description: "Vector + full-text search, Cohere embed-v4, seed data" },
              { sprint: "Sprint 3", title: "MCP Server", status: "gepland" as const, description: "Kennisbasis beschikbaar maken voor elk LLM-client (Claude, ChatGPT, etc.)" },
              { sprint: "Sprint 4", title: "Fireflies webhook + Gatekeeper", status: "gepland" as const, description: "Meetings automatisch ontvangen en classificeren" },
              { sprint: "Sprint 5", title: "Extractor + pipeline", status: "gepland" as const, description: "Besluiten, actiepunten en inzichten automatisch extraheren" },
              { sprint: "Sprint 6", title: "MCP tools uitbreiden", status: "gepland" as const, description: "Gerichte zoek-tools per domein (mensen, projecten, tijdlijn)" },
            ].map((item) => (
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
          <CardTitle className="text-base">Test resultaten (vandaag)</CardTitle>
          <CardDescription>Wat hebben we live getest op de preview branch?</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              { test: "Cohere embed-v4 embedding generatie", result: "11 records geembed (8 people, 3 projects)", pass: true },
              { test: "Re-embed worker (/api/test/embed)", result: "Verwerkt alle stale records automatisch", pass: true },
              { test: "Fireflies API connectie", result: "3 echte transcripts gevonden", pass: true },
              { test: "Hybrid search (search_all_content)", result: "Werkt, maar nog geen meetings om te doorzoeken", pass: true },
              { test: "Ask pipeline (/api/ask)", result: "Claude plant queries, zoekt, geeft eerlijk 'geen data' terug", pass: true },
            ].map((item) => (
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
