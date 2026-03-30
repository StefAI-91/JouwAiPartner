import {
  Mic,
  Brain,
  Search,
  AlertTriangle,
  Users,
  Bell,
  Database,
  RefreshCw,
  Shield,
  type LucideIcon,
} from "lucide-react";

export const iconMap: Record<string, LucideIcon> = {
  Mic,
  Brain,
  Search,
  AlertTriangle,
  Users,
  Bell,
  Database,
  RefreshCw,
  Shield,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface FeatureItem {
  iconName: string;
  title: string;
  description: string;
  status: "actief" | "gepland";
  details: string[];
}

export interface PipelineStep {
  label: string;
  sub: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
export const pipelineSteps: PipelineStep[] = [
  { label: "Fireflies", sub: "Webhook" },
  { label: "Pre-filters", sub: "Regels" },
  { label: "Gatekeeper", sub: "Haiku AI" },
  { label: "Novelty", sub: "Dedup" },
  { label: "Entities", sub: "Matching" },
  { label: "Opslaan", sub: "Embeddings" },
  { label: "Conflicts", sub: "Detectie" },
  { label: "Slack", sub: "Notificatie" },
];

export const features: FeatureItem[] = [
  {
    iconName: "Mic",
    title: "Fireflies Ingestie",
    description: "Automatische verwerking van meeting transcripts",
    status: "actief",
    details: [
      "Webhook ontvangt automatisch nieuwe transcripts van Fireflies",
      "Pre-filters: meetings < 2 min of zonder deelnemers worden geskipt",
      "Transcripts in chunks van ~600 tokens voor optimale zoekresultaten",
      "Dubbele meetings automatisch gedetecteerd (idempotency)",
    ],
  },
  {
    iconName: "Brain",
    title: "Gatekeeper + Extractie",
    description: "AI-agent die content beoordeelt en structured data extraheert",
    status: "actief",
    details: [
      "Scoort relevantie (0.0–1.0) — alleen score >= 0.6 wordt opgeslagen",
      "Extraheert in 1 call: besluiten, actiepunten, updates, strategie, klantinfo",
      "Herkent entiteiten: personen, projecten, klanten, onderwerpen",
      "Actiepunten met automatische scope (project/persoonlijk)",
    ],
  },
  {
    iconName: "Users",
    title: "Entity Resolution",
    description: "Koppelt namen aan bestaande projecten en klanten",
    status: "actief",
    details: [
      "3-staps matching: exact → alias → embedding-similarity",
      "Hoge similarity (> 0.85): naam wordt automatisch als alias toegevoegd",
      "Ongematchte namen in pending_matches voor handmatige review",
      "Besluiten en actiepunten gekoppeld aan het juiste project",
    ],
  },
  {
    iconName: "AlertTriangle",
    title: "Conflict-detectie",
    description: "Detecteert tegenstrijdige besluiten automatisch",
    status: "actief",
    details: [
      "Vergelijkt nieuw besluit met bestaande content (similarity > 0.8)",
      "Bij conflict: entry in update_suggestions met oud vs nieuw",
      "Directe Slack-notificatie met context over het conflict",
      "Systeem wijzigt nooit zelf — alleen signaleren en suggereren",
    ],
  },
  {
    iconName: "Search",
    title: "Semantisch Zoeken",
    description: "Zoek op betekenis, niet op exacte woorden",
    status: "actief",
    details: [
      "Cross-tabel: meetings, documenten, Slack en e-mails tegelijk",
      "Cohere embed-v4 embeddings (1024 dimensies) voor nauwkeurige resultaten",
      "Gerangschikt op relevantie (cosine similarity)",
      "Zoeken via MCP search_knowledge tool met natuurlijke taal query",
    ],
  },
  {
    iconName: "RefreshCw",
    title: "Re-embedding Worker",
    description: "Houdt embeddings automatisch up-to-date",
    status: "actief",
    details: [
      "Elke 10 minuten via pg_cron",
      "Verwerkt rijen met embedding_stale = true",
      "Batches van 50 per tabel",
      "Meetings, decisions, documents, projects, Slack, e-mails, people",
    ],
  },
  {
    iconName: "Bell",
    title: "Dagelijkse Digest",
    description: "Slack-overzicht van ongematchte entiteiten",
    status: "actief",
    details: [
      "Dagelijks om 09:00 via pg_cron",
      "Ongematchte namen gegroepeerd met aantal en brontabellen",
      "Toont mogelijke matches met similarity score",
    ],
  },
  {
    iconName: "Shield",
    title: "Authenticatie",
    description: "E-mail/wachtwoord login via Supabase Auth",
    status: "actief",
    details: [
      "Middleware beschermt alle pagina's behalve /login",
      "Webhooks en cron endpoints uitgezonderd van auth",
      "Sessies via Supabase SSR cookies",
    ],
  },
  {
    iconName: "Database",
    title: "MCP Server",
    description: "Kennis beschikbaar voor elke LLM-client",
    status: "gepland",
    details: [
      "Aparte TypeScript/Node.js process",
      "Zoeken, opvragen en koppelen via MCP protocol",
      "Compatibel met Claude Desktop, Cursor en andere clients",
    ],
  },
];

export const faqs: FaqItem[] = [
  {
    question: "Hoe komt data in het systeem?",
    answer:
      "Via Fireflies: wanneer een transcriptie klaar is, stuurt Fireflies een webhook. De transcript wordt verwerkt door de Gatekeeper, entiteiten worden gekoppeld, en alles wordt opgeslagen met embeddings.",
  },
  {
    question: "Wat gebeurt er als een meeting wordt afgekeurd?",
    answer:
      "Meetings met relevantie < 0.6 worden niet opgeslagen. De beslissing wordt gelogd in content_reviews. Meetings < 2 min of zonder deelnemers worden al voor de AI-stap gefilterd.",
  },
  {
    question: "Hoe werkt conflict-detectie?",
    answer:
      "Elk nieuw besluit wordt via embedding-similarity vergeleken met bestaande content. Bij similarity > 0.8 wordt een conflict gesignaleerd via Slack en opgeslagen als update_suggestion. Het systeem wijzigt nooit zelf content.",
  },
  {
    question: "Wat zijn pending matches?",
    answer:
      "Wanneer de AI een naam extraheert die niet automatisch gekoppeld kan worden, komt deze in pending_matches. Via de dagelijkse Slack-digest word je geinformeerd.",
  },
  {
    question: "Welke AI-modellen worden gebruikt?",
    answer:
      "Claude Haiku voor de Gatekeeper (~$0.001 per call). Cohere embed-v4 voor embeddings. Later: Sonnet voor de Curator, Opus voor de Analyst.",
  },
];
