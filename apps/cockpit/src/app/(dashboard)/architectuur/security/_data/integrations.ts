import { Mic, Brain, Database, Search, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DataField {
  name: string;
  sensitivity: "hoog" | "midden" | "laag" | "publiek";
  description: string;
}

export interface IntegrationFlow {
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

export const integrations: IntegrationFlow[] = [
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
      "Extractor — Claude Sonnet (extractie bij ingest)",
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
      "Geen Row Level Security (RLS) policies actief — accepted risk tot v3 (client portal). Klein team, iedereen ziet alles.",
      "Alle geauthenticeerde gebruikers kunnen alle data zien",
    ],
  },
  {
    icon: Wrench,
    name: "MCP Server + OAuth 2.1",
    provider: "Eigen (Vercel)",
    purpose:
      "Model Context Protocol endpoint met OAuth 2.1 + PKCE beveiliging. AI-clients (Claude Desktop, etc.) authenticeren via authorization code flow.",
    region: "Vercel Edge (afhankelijk van deployment regio)",
    credentials: [
      {
        name: "OAUTH_SECRET",
        type: "JWT signing key (HS256, min 32 chars)",
        sensitivity: "Kritiek",
      },
      {
        name: "Supabase session cookie",
        type: "Fallback auth (via Supabase SSR)",
        sensitivity: "Hoog",
      },
    ],
    dataOut: [
      {
        name: "Authorization codes",
        sensitivity: "hoog",
        description: "Eenmalige codes (10 min geldig) voor OAuth token exchange",
      },
      {
        name: "JWT access tokens",
        sensitivity: "hoog",
        description: "HS256-signed Bearer tokens (1 uur geldig) met sub, scope, client_id",
      },
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
        name: "OAuth requests",
        sensitivity: "midden",
        description: "Authorization requests met PKCE challenge, token requests met code_verifier",
      },
      {
        name: "Client registration",
        sensitivity: "laag",
        description: "RFC 7591 dynamic client registration met redirect_uris",
      },
      {
        name: "Tool calls",
        sensitivity: "laag",
        description: "MCP protocol berichten met tool-naam en parameters (zoekvraag, filters)",
      },
    ],
    endpoints: [
      "/.well-known/oauth-authorization-server — OAuth server metadata (discovery)",
      "/api/oauth/register — Dynamic client registration (RFC 7591)",
      "/api/oauth/authorize — Authorization endpoint (vereist Supabase login, PKCE S256 verplicht)",
      "/api/oauth/token — Token endpoint (authorization_code grant, PKCE verificatie)",
      "/api/mcp — POST (dual auth: OAuth Bearer token of Supabase session cookie)",
      "10 tools: search_knowledge, get_meeting_summary, get_decisions, get_action_items, get_organization_overview, list_meetings, get_organizations, get_projects, get_people, correct_extraction",
    ],
    risks: [
      "Auth codes in-memory opgeslagen — gaan verloren bij server restart (serverless: beperkt window)",
      "Dynamic client registration is open — elke client kan zich registreren zonder voorafgaande goedkeuring",
      "JWT tokens zijn 1 uur geldig — geen revocation mechanisme",
      "Alle MCP tools draaien op admin client (service role) zonder RLS",
      "correct_extraction tool kan extracties muteren vanuit AI-client",
    ],
  },
];
