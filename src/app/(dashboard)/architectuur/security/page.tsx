import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Mic,
  Brain,
  Database,
  Search,
  Wrench,
  ArrowRight,
  Shield,
  Key,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DataField {
  name: string;
  sensitivity: "hoog" | "midden" | "laag" | "publiek";
  description: string;
}

interface IntegrationFlow {
  icon: LucideIcon;
  name: string;
  provider: string;
  purpose: string;
  region: string;
  credentials: { name: string; type: string; sensitivity: string }[];
  dataOut: DataField[];
  dataIn: DataField[];
  endpoints: string[];
  risks: string[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const integrations: IntegrationFlow[] = [
  {
    icon: Mic,
    name: "Fireflies.ai",
    provider: "Fireflies Inc.",
    purpose: "Meeting-opnames ontvangen en transcripts ophalen via webhook en GraphQL API.",
    region: "US (Fireflies cloud)",
    credentials: [
      {
        name: "FIREFLIES_API_KEY",
        type: "API Key (Bearer)",
        sensitivity: "Hoog",
      },
      {
        name: "FIREFLIES_WEBHOOK_SECRET",
        type: "HMAC-SHA256 secret",
        sensitivity: "Hoog",
      },
    ],
    dataOut: [
      {
        name: "API Key",
        sensitivity: "hoog",
        description: "Authenticatie bij Fireflies GraphQL API",
      },
      {
        name: "Meeting ID",
        sensitivity: "laag",
        description: "Om specifiek transcript op te halen",
      },
      {
        name: "Limit parameter",
        sensitivity: "laag",
        description: "Aantal transcripts bij polling (max 30)",
      },
    ],
    dataIn: [
      {
        name: "Meeting titel",
        sensitivity: "midden",
        description: "Titel van de meeting",
      },
      {
        name: "Deelnemers",
        sensitivity: "hoog",
        description: "Namen en e-mailadressen van alle deelnemers",
      },
      {
        name: "Volledig transcript",
        sensitivity: "hoog",
        description: "Alle gesproken tekst met spreker, timestamps per zin",
      },
      {
        name: "Samenvatting",
        sensitivity: "midden",
        description: "AI-gegenereerde samenvatting, actiepunten, keywords, topics",
      },
      {
        name: "Meeting metadata",
        sensitivity: "laag",
        description: "Datum, duur, meeting ID",
      },
    ],
    endpoints: [
      "/api/webhooks/fireflies — ontvangt POST bij nieuwe transcriptie (HMAC-gevalideerd)",
      "/api/ingest/fireflies — polling endpoint voor handmatige ingest (Bearer token)",
    ],
    risks: [
      "Transcripts bevatten mogelijk vertrouwelijke klantgesprekken",
      "Deelnemerslijst bevat persoonlijke e-mailadressen (PII)",
      "Data transit naar US-gebaseerde Fireflies servers",
    ],
  },
  {
    icon: Brain,
    name: "Anthropic (Claude)",
    provider: "Anthropic PBC",
    purpose:
      "AI-classificatie (Gatekeeper) en extractie (Extractor) van meeting content. Antwoordsynthese bij zoekvragen.",
    region: "US / EU (Anthropic API, afhankelijk van routing)",
    credentials: [
      {
        name: "ANTHROPIC_API_KEY",
        type: "API Key (via @ai-sdk/anthropic)",
        sensitivity: "Hoog",
      },
    ],
    dataOut: [
      {
        name: "Meeting samenvatting + metadata",
        sensitivity: "hoog",
        description: "Titel, deelnemers, topics, samenvatting naar Gatekeeper (Haiku)",
      },
      {
        name: "Volledig transcript + context",
        sensitivity: "hoog",
        description: "Hele transcript naar Extractor (Sonnet) voor besluit/actiepunt extractie",
      },
      {
        name: "Zoekvragen van gebruikers",
        sensitivity: "midden",
        description: "Gebruikersvragen naar Haiku voor zoekdecompositie en antwoordsynthese",
      },
      {
        name: "Zoekresultaten als context",
        sensitivity: "hoog",
        description:
          "Top-10 zoekresultaten (meetings + extracties) als context voor antwoordgeneratie",
      },
    ],
    dataIn: [
      {
        name: "Gatekeeper classificatie",
        sensitivity: "laag",
        description: "meeting_type, party_type, relevance_score, organization_name",
      },
      {
        name: "Extracties",
        sensitivity: "midden",
        description:
          "Besluiten, actiepunten, inzichten, behoeften met confidence scores en transcript-referenties",
      },
      {
        name: "Zoekantwoorden",
        sensitivity: "midden",
        description: "Gegenereerde antwoorden op gebruikersvragen",
      },
    ],
    endpoints: [
      "Gatekeeper — Claude Haiku 4.5 (classificatie bij ingest)",
      "Extractor — Claude Sonnet 4.5 (extractie bij ingest)",
      "Zoekdecompositie — Claude Haiku 4.5 (bij /api/ask)",
      "Antwoordsynthese — Claude Haiku 4.5 (bij /api/ask)",
    ],
    risks: [
      "Volledige transcripts (incl. klantdata) worden naar Anthropic gestuurd",
      "Prompt caching is ingeschakeld (ephemeral) — data tijdelijk in Anthropic cache",
      "Geen garantie op EU-only processing tenzij expliciet geconfigureerd",
    ],
  },
  {
    icon: Search,
    name: "Cohere",
    provider: "Cohere Inc.",
    purpose: "Tekst omzetten naar 1024-dimensionale embeddings voor semantisch zoeken.",
    region: "US (Cohere cloud)",
    credentials: [
      {
        name: "COHERE_API_KEY",
        type: "API Key (CohereClient constructor)",
        sensitivity: "Hoog",
      },
    ],
    dataOut: [
      {
        name: "Meeting samenvattingen",
        sensitivity: "hoog",
        description:
          "Titel + deelnemers + samenvatting + extracties gecomprimeerd tot embedding-tekst",
      },
      {
        name: "Extractie-inhoud",
        sensitivity: "midden",
        description: "Individuele besluiten, actiepunten, inzichten, behoeften",
      },
      {
        name: "Persoonsnamen + rollen",
        sensitivity: "midden",
        description: "Naam, rol, team van personen voor people-embedding",
      },
      {
        name: "Projectnamen",
        sensitivity: "laag",
        description: "Projectnamen voor project-embedding",
      },
      {
        name: "Zoekopdrachten",
        sensitivity: "midden",
        description: "Gebruikersvragen voor query-embedding",
      },
    ],
    dataIn: [
      {
        name: "Embedding vectors",
        sensitivity: "laag",
        description: "1024-dimensionale float arrays — geen leesbare data, alleen numeriek",
      },
    ],
    endpoints: [
      "Cohere v2 API — embed-v4.0 model",
      "Batch embedding: tot 96 teksten per request",
      "inputType: search_document (opslag) / search_query (zoeken)",
    ],
    risks: [
      "Leesbare tekst (samenvattingen, extracties) wordt naar Cohere gestuurd",
      "Batch requests kunnen veel data tegelijk bevatten",
      "Data transit naar US-gebaseerde Cohere servers",
    ],
  },
  {
    icon: Database,
    name: "Supabase (PostgreSQL)",
    provider: "Supabase Inc.",
    purpose:
      "Primaire database voor alle opgeslagen data. PostgreSQL met pgvector voor embeddings.",
    region: "EU-Frankfurt (aws-eu-central-1)",
    credentials: [
      {
        name: "NEXT_PUBLIC_SUPABASE_URL",
        type: "Project URL",
        sensitivity: "Publiek",
      },
      {
        name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        type: "Anon Key (RLS-beperkt)",
        sensitivity: "Publiek",
      },
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        type: "Service Role Key (volledige toegang)",
        sensitivity: "Kritiek",
      },
    ],
    dataOut: [],
    dataIn: [],
    endpoints: [
      "Browser client — anon key, voor ingelogde gebruikers",
      "Server client — anon key + cookies, voor Server Components",
      "Admin client — service role key, voor pipelines en ingest",
    ],
    risks: [
      "Service role key geeft volledige database-toegang zonder RLS",
      "Geen Row Level Security (RLS) policies actief op tabellen",
      "Alle geauthenticeerde gebruikers kunnen alle data zien",
    ],
  },
  {
    icon: Wrench,
    name: "MCP Server",
    provider: "Eigen (Vercel)",
    purpose:
      "Model Context Protocol endpoint waarmee AI-clients (Claude Desktop, etc.) de kennisbank kunnen doorzoeken.",
    region: "Vercel Edge (afhankelijk van deployment regio)",
    credentials: [
      {
        name: "Geen authenticatie",
        type: "Open endpoint",
        sensitivity: "Kritiek risico",
      },
    ],
    dataOut: [
      {
        name: "Zoekresultaten",
        sensitivity: "hoog",
        description: "Meeting-samenvattingen, besluiten, actiepunten, inzichten met bronvermelding",
      },
      {
        name: "Organisatie- en projectdata",
        sensitivity: "midden",
        description: "Namen, statussen, contactpersonen van klanten en projecten",
      },
      {
        name: "Persoonsgegevens",
        sensitivity: "hoog",
        description: "Namen, e-mailadressen, rollen, teams",
      },
    ],
    dataIn: [
      {
        name: "Tool calls",
        sensitivity: "laag",
        description: "MCP protocol berichten met tool-naam en parameters (zoekvraag, filters)",
      },
    ],
    endpoints: [
      "/api/mcp — POST (tool calls), GET (405), DELETE (no-op)",
      "7 tools: search_knowledge, get_meeting_summary, get_decisions, get_action_items, get_organizations, get_projects, get_people",
    ],
    risks: [
      "Endpoint heeft GEEN authenticatie — iedereen met de URL kan alle data opvragen",
      "Alle tools draaien op admin client (service role) zonder RLS",
      "Geen rate limiting of toegangsbeheer",
    ],
  },
];

// ---------------------------------------------------------------------------
// Opgeslagen data overzicht
// ---------------------------------------------------------------------------
const storedDataTables = [
  {
    table: "meetings",
    description: "Verwerkte meeting-transcripts",
    ppiFields: [
      "participants (namen + e-mails)",
      "transcript (volledige gesproken tekst)",
      "summary (samenvatting met mogelijk gevoelige inhoud)",
      "raw_fireflies (volledig origineel Fireflies response)",
    ],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
  {
    table: "extractions",
    description: "Besluiten, actiepunten, inzichten, behoeften",
    ppiFields: [
      "content (extractie-inhoud, kan namen/bedragen bevatten)",
      "metadata (assignee, deadline, client naam)",
      "transcript_ref (exact citaat uit transcript)",
    ],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
  {
    table: "people",
    description: "Teamleden en contactpersonen",
    ppiFields: ["name", "email", "team", "role"],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
  {
    table: "organizations",
    description: "Klanten, partners, leveranciers",
    ppiFields: ["name", "contact_person", "email"],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
  {
    table: "profiles",
    description: "Platform-gebruikers (auth)",
    ppiFields: ["full_name", "email", "avatar_url"],
    retention: "Onbeperkt (gekoppeld aan Supabase Auth)",
  },
  {
    table: "projects",
    description: "Projecten gekoppeld aan organisaties",
    ppiFields: ["name (kan klantnaam bevatten)"],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
];

// ---------------------------------------------------------------------------
// Credentials overzicht
// ---------------------------------------------------------------------------
const allCredentials = [
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    risk: "kritiek",
    description: "Volledige database-toegang, bypassed RLS",
  },
  {
    name: "FIREFLIES_API_KEY",
    risk: "hoog",
    description: "Toegang tot alle Fireflies transcripts",
  },
  {
    name: "FIREFLIES_WEBHOOK_SECRET",
    risk: "hoog",
    description: "HMAC validatie van inkomende webhooks",
  },
  {
    name: "ANTHROPIC_API_KEY",
    risk: "hoog",
    description: "Claude API toegang (kostenrisico + data-exposure)",
  },
  {
    name: "COHERE_API_KEY",
    risk: "hoog",
    description: "Cohere embedding API toegang",
  },
  {
    name: "CRON_SECRET",
    risk: "hoog",
    description: "Bearer token voor cron/ingest endpoints",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    risk: "publiek",
    description: "Supabase project URL (bewust publiek)",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    risk: "publiek",
    description: "Supabase anon key (bewust publiek, beperkt door RLS)",
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function SensitivityBadge({
  level,
}: {
  level: "hoog" | "midden" | "laag" | "publiek" | "kritiek";
}) {
  const styles: Record<string, string> = {
    kritiek: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    hoog: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    midden: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    laag: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    publiek: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[level]}`}
    >
      {level}
    </span>
  );
}

function DataFlowTable({
  title,
  direction,
  fields,
}: {
  title: string;
  direction: "in" | "out";
  fields: DataField[];
}) {
  if (fields.length === 0) return null;

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ArrowRight className={`h-3 w-3 ${direction === "in" ? "rotate-180" : ""}`} />
        {title}
      </p>
      <div className="space-y-1.5">
        {fields.map((field) => (
          <div
            key={field.name}
            className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2"
          >
            <SensitivityBadge level={field.sensitivity} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{field.name}</p>
              <p className="text-[11px] text-muted-foreground">{field.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: IntegrationFlow }) {
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
              Endpoints & risico&apos;s
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Endpoints</p>
                  <ul className="space-y-1">
                    {integration.endpoints.map((ep) => (
                      <li key={ep} className="text-xs leading-relaxed text-muted-foreground">
                        <code className="mr-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                          {ep.split(" — ")[0]}
                        </code>
                        {ep.includes(" — ") && <span>{ep.split(" — ")[1]}</span>}
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SecurityDatamappingPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1>Security &amp; Datamapping</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Welke data raken we, wie heeft er toegang, en via welke koppelingen?
            </p>
          </div>
        </div>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overzicht</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground">
            Het platform verwerkt meeting-transcripts van klantgesprekken en interne overleggen.
            Data stroomt door <strong>5 systemen</strong>: Fireflies (bron), Anthropic Claude
            (AI-verwerking), Cohere (embeddings), Supabase (opslag, EU-Frankfurt) en ons MCP
            endpoint (toegang voor AI-clients).
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">5 externe integraties</Badge>
            <Badge variant="outline">6 API keys/secrets</Badge>
            <Badge variant="outline">8 database-tabellen</Badge>
            <Badge variant="outline">Opslag: EU-Frankfurt</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Integration data flows */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Dataflow per integratie</h2>
        <div className="space-y-4">
          {integrations.map((integration) => (
            <IntegrationCard key={integration.name} integration={integration} />
          ))}
        </div>
      </div>

      {/* Stored data overview */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Opgeslagen data &amp; PII</h2>
        <div className="space-y-3">
          {storedDataTables.map((table) => (
            <Card key={table.table}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      <code className="mr-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {table.table}
                      </code>
                      {table.description}
                    </p>
                    <div className="mt-2 space-y-1">
                      {table.ppiFields.map((field) => (
                        <p key={field} className="text-xs text-muted-foreground">
                          <span className="mr-1.5 text-orange-500">&bull;</span>
                          {field}
                        </p>
                      ))}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] text-orange-600">
                    {table.retention}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Credentials overview */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Credentials &amp; secrets</h2>
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {allCredentials.map((cred) => (
                <div
                  key={cred.name}
                  className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2"
                >
                  <SensitivityBadge level={cred.risk as "kritiek" | "hoog" | "publiek"} />
                  <code className="shrink-0 font-mono text-xs">{cred.name}</code>
                  <span className="text-xs text-muted-foreground">{cred.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action items */}
      <Card className="border-orange-200 dark:border-orange-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-orange-700 dark:text-orange-400">
            <Shield className="h-4 w-4" />
            Open actiepunten
          </CardTitle>
          <CardDescription>Prioriteiten voor de security baseline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              {
                priority: "kritiek",
                item: "Authenticatie toevoegen op /api/search, /api/ask en /api/mcp",
              },
              {
                priority: "kritiek",
                item: "CRON_SECRET verplicht maken (niet optioneel)",
              },
              {
                priority: "hoog",
                item: "Security headers toevoegen (CSP, X-Frame-Options, HSTS)",
              },
              {
                priority: "hoog",
                item: "Rate limiting op publieke API endpoints",
              },
              {
                priority: "hoog",
                item: "Audit logging voor data-toegang",
              },
              {
                priority: "midden",
                item: "Data retentiebeleid definieren en implementeren",
              },
              {
                priority: "midden",
                item: "Offboarding procedure: API keys roteren, data verwijderen per organisatie",
              },
              {
                priority: "midden",
                item: "RLS policies activeren op alle Supabase tabellen",
              },
            ].map(({ priority, item }) => (
              <div key={item} className="flex items-start gap-2 text-xs">
                <SensitivityBadge level={priority as "kritiek" | "hoog" | "midden"} />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
