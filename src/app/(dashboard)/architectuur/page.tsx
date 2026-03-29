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
  Wrench,
  Building2,
  FolderKanban,
  Users,
  MessageSquare,
  CheckCircle2,
  ListChecks,
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
    sprint: "Sprint 4",
    status: "live",
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
    status: "live",
    simpleExplanation:
      "Twee AI-agents verwerken elke meeting. De Gatekeeper classificeert (wat voor meeting is dit?), de Extractor haalt besluiten, actiepunten en inzichten eruit. Daarna worden meeting en extracties direct geembed zodat ze meteen doorzoekbaar zijn.",
    technicalDetails: [
      "Gatekeeper (Claude Haiku 4.5): classificeert meeting_type, party_type, relevance_score (0.0-1.0)",
      "Extractor (Claude Sonnet 4.5): haalt decisions, action_items, needs, insights eruit met confidence score en transcript_ref",
      "Transcript_ref validatie: exacte quote-check tegen transcript, confidence \u2192 0.0 bij mismatch",
      "Meeting-type-specifieke extractie-instructies (client_call \u2192 needs, strategy \u2192 decisions, etc.)",
      "Entity resolution: koppelt genoemde organisaties/projecten aan de database (exact \u2192 alias \u2192 embedding match)",
      "Inline embedding na pipeline: meeting + extracties direct doorzoekbaar via Cohere embed-v4",
      "raw_fireflies JSONB: volledige audit trail van Fireflies + Gatekeeper + Extractor output",
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
      'De database is geoptimaliseerd om snel te zoeken. Er zijn speciale indexen voor zowel betekenis-zoeken ("vind alles over AI strategie") als exacte tekst-zoeken ("het woord \'budget\'").',
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
    "Model: Cohere embed-v4.0 via v2 API (1024 dimensies, outputDimension parameter)",
    "inputType: 'search_document' voor opslag, 'search_query' voor zoekopdrachten",
    "Batch embedding: tot 96 teksten per API call",
    "Inline embedding: meeting + extracties worden direct na pipeline geembed",
    "Re-embed worker als fallback voor records met embedding_stale = true",
  ],
};

// ---------------------------------------------------------------------------
// MCP Tools
// ---------------------------------------------------------------------------
interface ToolInfo {
  icon: LucideIcon;
  name: string;
  description: string;
  simpleExplanation: string;
  parameters: { name: string; description: string; required: boolean }[];
  exampleQuestions: string[];
}

const mcpTools: ToolInfo[] = [
  {
    icon: Search,
    name: "search_knowledge",
    description: "Semantisch zoeken over alle content",
    simpleExplanation:
      "Zoekt door alle meetings en extracties op basis van betekenis. Combineert twee methoden: vector search (begrijpt de betekenis) en full-text search (vindt exacte woorden). De resultaten worden gefuseerd via Reciprocal Rank Fusion zodat je altijd de meest relevante resultaten krijgt.",
    parameters: [
      { name: "query", description: "Je zoekvraag in gewone taal", required: true },
      { name: "limit", description: "Max aantal resultaten (standaard 10)", required: false },
    ],
    exampleQuestions: [
      "Wat weten we over het Ordus project?",
      "Zijn er afspraken gemaakt over het budget?",
      "Wat is er besproken over de planning van Fleur op zak?",
    ],
  },
  {
    icon: MessageSquare,
    name: "get_meeting_summary",
    description: "Meeting detail met alle extracties",
    simpleExplanation:
      "Haalt alle informatie op over een specifieke meeting: samenvatting, deelnemers, type meeting, organisatie, en alle extracties (besluiten, actiepunten, inzichten) die eruit zijn gehaald. Je kunt zoeken op meeting ID of op titel.",
    parameters: [
      { name: "meeting_id", description: "UUID van de meeting", required: false },
      { name: "title_search", description: "Zoek op titel (deels matchen)", required: false },
    ],
    exampleQuestions: [
      "Vat de kick-off meeting met Effect op Maat samen",
      "Wat is er besproken in de meeting met het AI team?",
    ],
  },
  {
    icon: CheckCircle2,
    name: "get_decisions",
    description: "Besluiten uit meetings ophalen",
    simpleExplanation:
      "Haalt alle besluiten op die uit meetings zijn geextraheerd. Elk besluit toont de confidence score (hoe zeker de AI is), de bron-meeting, en eventueel een citaat uit het transcript.",
    parameters: [
      { name: "project", description: "Filter op projectnaam", required: false },
      { name: "date_from", description: "Vanaf datum (ISO formaat)", required: false },
      { name: "date_to", description: "Tot datum (ISO formaat)", required: false },
      { name: "limit", description: "Max resultaten (standaard 20)", required: false },
    ],
    exampleQuestions: [
      "Welke besluiten zijn er genomen over Ordus?",
      "Wat is er deze week besloten?",
      "Toon alle besluiten van de afgelopen maand",
    ],
  },
  {
    icon: ListChecks,
    name: "get_action_items",
    description: "Actiepunten uit meetings ophalen",
    simpleExplanation:
      "Haalt alle actiepunten op die uit meetings zijn geextraheerd. Je kunt filteren op persoon (wie moet het doen) of op project.",
    parameters: [
      { name: "person", description: "Filter op naam (deels matchen in inhoud)", required: false },
      { name: "project", description: "Filter op projectnaam", required: false },
      { name: "limit", description: "Max resultaten (standaard 20)", required: false },
    ],
    exampleQuestions: [
      "Welke actiepunten staan er open voor Stef?",
      "Wat moet er nog gebeuren voor het Ordus project?",
      "Toon alle actiepunten",
    ],
  },
  {
    icon: Building2,
    name: "get_organizations",
    description: "Organisaties opzoeken",
    simpleExplanation:
      "Zoekt door alle organisaties in het systeem: klanten, partners, leveranciers. Je kunt filteren op type (client, partner, supplier) of status (active, prospect, inactive).",
    parameters: [
      { name: "search", description: "Zoek op naam (deels matchen)", required: false },
      { name: "type", description: "client, partner, supplier, of other", required: false },
      { name: "status", description: "prospect, active, of inactive", required: false },
    ],
    exampleQuestions: [
      "Welke klanten hebben we?",
      "Wat weten we over Ordus als organisatie?",
      "Toon alle actieve partners",
    ],
  },
  {
    icon: FolderKanban,
    name: "get_projects",
    description: "Projecten opzoeken",
    simpleExplanation:
      "Zoekt door alle projecten met hun gekoppelde organisatie. Filter op naam, organisatie of status (lead, active, paused, completed, cancelled).",
    parameters: [
      { name: "search", description: "Zoek op projectnaam (deels matchen)", required: false },
      { name: "organization", description: "Filter op organisatienaam", required: false },
      {
        name: "status",
        description: "lead, active, paused, completed, of cancelled",
        required: false,
      },
    ],
    exampleQuestions: [
      "Welke projecten zijn er actief?",
      "Welke projecten lopen er voor Ordus?",
      "Toon alle interne projecten",
    ],
  },
  {
    icon: Users,
    name: "get_people",
    description: "Mensen opzoeken",
    simpleExplanation:
      "Zoekt door alle mensen in het systeem: teamleden, klanten, partners. Filter op naam, team of rol.",
    parameters: [
      { name: "search", description: "Zoek op naam (deels matchen)", required: false },
      {
        name: "team",
        description: "Filter op team (engineering, leadership, etc.)",
        required: false,
      },
      { name: "role", description: "Filter op rol (deels matchen)", required: false },
    ],
    exampleQuestions: [
      "Wie werkt er bij Flowwijs?",
      "Wie zit er in het engineering team?",
      "Toon alle mede-eigenaren",
    ],
  },
];

const seedSection = {
  simpleExplanation:
    "Het systeem is voorgeladen met jullie echte organisaties, teamleden en projecten. Zo kan het platform meteen namen herkennen wanneer ze in meetings voorkomen.",
  data: [
    {
      category: "Organisaties",
      items: ["Flowwijs (eigen)", "Ordus (klant)", "Effect op maat (klant)"],
    },
    {
      category: "Team",
      items: ["Stef Banninga", "Wouter van den Heuvel", "Ege", "Tibor", "Kenji", "Myrrh"],
    },
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

function LayerCard({
  icon: Icon,
  title,
  sprint,
  status,
  simpleExplanation,
  technicalDetails,
  tables,
}: LayerProps) {
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

        {/* What is MCP */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Wat is MCP?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground">
              MCP (Model Context Protocol) is een standaard waarmee AI-assistenten zoals Claude
              tools kunnen gebruiken. Onze MCP server draait op Vercel en geeft Claude directe
              toegang tot jullie kennisbasis. Claude kan zelf beslissen welke tool het beste past
              bij je vraag.
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
                  of{" "}
                  <code className="rounded bg-muted px-1 font-mono text-[11px]">get_projects</code>)
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
                  <p className="text-sm leading-relaxed text-foreground">
                    {tool.simpleExplanation}
                  </p>

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
                            {param.required && (
                              <span className="ml-1 text-primary">(verplicht)</span>
                            )}
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
            {[
              {
                sprint: "Sprint 1",
                title: "Database tabellen",
                status: "live" as const,
                description: "Alle tabellen, relaties en triggers aangemaakt",
              },
              {
                sprint: "Sprint 2",
                title: "Indexes, zoeken en embeddings",
                status: "live" as const,
                description: "Vector + full-text search, Cohere embed-v4, seed data",
              },
              {
                sprint: "Sprint 3",
                title: "MCP Server + Tools",
                status: "live" as const,
                description:
                  "7 tools: search, meetings, besluiten, actiepunten, organisaties, projecten, mensen",
              },
              {
                sprint: "Sprint 4",
                title: "Fireflies webhook + Gatekeeper",
                status: "live" as const,
                description: "Meetings automatisch ontvangen, classificeren en opslaan",
              },
              {
                sprint: "Sprint 5",
                title: "Extractor + embedding pipeline",
                status: "live" as const,
                description:
                  "Volledige pipeline: Gatekeeper \u2192 Extractor \u2192 opslag \u2192 embedding. 23 extracties uit 1 meeting, alles direct doorzoekbaar.",
              },
              {
                sprint: "Sprint 6",
                title: "MCP tools uitbreiden",
                status: "gepland" as const,
                description: "Gerichte zoek-tools per domein (mensen, projecten, tijdlijn)",
              },
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
          <CardTitle className="text-base">Test resultaten</CardTitle>
          <CardDescription>Live getest op de preview branch</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              {
                test: "Volledige pipeline: Gatekeeper \u2192 Extractor \u2192 opslag \u2192 embedding",
                result: "1 meeting \u2192 23 extracties \u2192 alles geembed en doorzoekbaar",
                pass: true,
              },
              {
                test: "Gatekeeper classificatie (Claude Haiku 4.5)",
                result: "meeting_type: strategy, relevance: 0.95, party_type: partner",
                pass: true,
              },
              {
                test: "Extractor (Claude Sonnet 4.5)",
                result: "4 decisions, 5 action_items, 4 needs, 8 insights met transcript_ref",
                pass: true,
              },
              {
                test: "Cohere embed-v4 (v2 API, 1024 dim)",
                result: "Meeting + 23 extracties + people + projects geembed",
                pass: true,
              },
              {
                test: "Entity resolution (3-tier)",
                result: "Projecten 'MVP - Effect op Maat' en 'Fleur op Zak' herkend",
                pass: true,
              },
              {
                test: "Idempotency check",
                result: "Duplicate meetings correct overgeslagen",
                pass: true,
              },
              {
                test: "Pre-filters",
                result: "Meetings zonder deelnemers overgeslagen",
                pass: true,
              },
              {
                test: "raw_fireflies JSONB",
                result: "Audit trail met gatekeeper + extractor metadata opgeslagen",
                pass: true,
              },
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
