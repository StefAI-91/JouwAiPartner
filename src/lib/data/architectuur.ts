import {
  Database,
  Search,
  Brain,
  Mic,
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

export const iconMap: Record<string, LucideIcon> = {
  Database,
  Search,
  Brain,
  Mic,
  Layers,
  Wrench,
  Building2,
  FolderKanban,
  Users,
  MessageSquare,
  CheckCircle2,
  ListChecks,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface LayerItem {
  iconName: string;
  title: string;
  sprint: string;
  status: "live" | "gepland";
  simpleExplanation: string;
  technicalDetails: string[];
  tables?: string[];
}

export interface ToolParameter {
  name: string;
  description: string;
  required: boolean;
}

export interface ToolInfo {
  iconName: string;
  name: string;
  description: string;
  simpleExplanation: string;
  parameters: ToolParameter[];
  exampleQuestions: string[];
}

export interface SeedCategory {
  category: string;
  items: string[];
}

export interface RoadmapItem {
  sprint: string;
  title: string;
  status: "live" | "gepland";
  description: string;
}

export interface TestResult {
  test: string;
  result: string;
  pass: boolean;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
export const layers: LayerItem[] = [
  {
    iconName: "Mic",
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
    iconName: "Brain",
    title: "AI Verwerking",
    sprint: "Sprint 4-5",
    status: "live",
    simpleExplanation:
      "Twee AI-agents verwerken elke meeting. De Gatekeeper classificeert (wat voor meeting is dit?), de Extractor haalt besluiten, actiepunten en inzichten eruit. Daarna worden meeting en extracties direct geembed zodat ze meteen doorzoekbaar zijn.",
    technicalDetails: [
      "Gatekeeper (Claude Haiku 4.5): classificeert meeting_type, party_type, relevance_score (0.0-1.0)",
      "Extractor (Claude Sonnet 4.5): haalt decisions, action_items, needs, insights eruit met confidence score en transcript_ref",
      "Transcript_ref validatie: exacte quote-check tegen transcript, confidence → 0.0 bij mismatch",
      "Meeting-type-specifieke extractie-instructies (client_call → needs, strategy → decisions, etc.)",
      "Entity resolution: koppelt genoemde organisaties/projecten aan de database (exact → alias → embedding match)",
      "Inline embedding na pipeline: meeting + extracties direct doorzoekbaar via Cohere embed-v4",
      "raw_fireflies JSONB: volledige audit trail van Fireflies + Gatekeeper + Extractor output",
      "Alles wordt opgeslagen — niets wordt weggegooid. Onzekere content krijgt lage confidence.",
    ],
  },
  {
    iconName: "Database",
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
      "organizations — klanten, partners, leveranciers (met aliases voor naamherkenning)",
      "people — teamleden en contactpersonen",
      "projects — gekoppeld aan organisaties",
      "meetings — transcripts, samenvattingen, classificaties van Fireflies",
      "extractions — besluiten, actiepunten, inzichten, behoeften uit meetings",
    ],
  },
  {
    iconName: "Layers",
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
    iconName: "Search",
    title: "Zoeken",
    sprint: "Sprint 2",
    status: "live",
    simpleExplanation:
      "Het platform combineert twee zoekmethoden. Semantisch zoeken begrijpt de betekenis van je vraag. Full-text zoeken vindt exacte woorden. Samen leveren ze de beste resultaten op.",
    technicalDetails: [
      "search_all_content() — hybride zoeken over meetings + extracties via Reciprocal Rank Fusion (RRF)",
      "RRF combineert vector similarity ranking met full-text ranking in één score",
      "match_people() — vind mensen op basis van embedding similarity",
      "match_projects() — vind projecten op basis van embedding similarity",
      "search_meetings_by_participant() — meetings van een specifiek persoon + optioneel tekst zoeken",
    ],
  },
];

export const embedSection = {
  simpleExplanation:
    "Elke tekst (meeting-samenvatting, persoonsnaam, projectnaam) wordt omgezet in een lijst van 1024 getallen — een 'embedding'. Teksten die qua betekenis op elkaar lijken, hebben vergelijkbare getallen. Zo kan het systeem zoeken op betekenis in plaats van exacte woorden.",
  technicalDetails: [
    "Model: Cohere embed-v4.0 via v2 API (1024 dimensies, outputDimension parameter)",
    "inputType: 'search_document' voor opslag, 'search_query' voor zoekopdrachten",
    "Batch embedding: tot 96 teksten per API call",
    "Inline embedding: meeting + extracties worden direct na pipeline geembed",
    "Re-embed worker als fallback voor records met embedding_stale = true",
  ],
};

export const mcpTools: ToolInfo[] = [
  {
    iconName: "Search",
    name: "search_knowledge",
    description: "Semantisch zoeken over alle content met bronvermelding",
    simpleExplanation:
      "Zoekt door alle meetings en extracties op basis van betekenis. Combineert vector search (begrijpt de betekenis) en full-text search (vindt exacte woorden) via Reciprocal Rank Fusion. Elk resultaat toont de bron (meeting titel + datum), een transcript-citaat, en de verificatie-status: 'AI (confidence: X%)' of 'Geverifieerd' als iemand het heeft gecorrigeerd.",
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
    iconName: "MessageSquare",
    name: "get_meeting_summary",
    description: "Meeting detail met alle extracties en verificatie-status",
    simpleExplanation:
      "Haalt alle informatie op over een specifieke meeting: samenvatting, deelnemers, type meeting, organisatie, en alle extracties (besluiten, actiepunten, inzichten). Elke extractie toont metadata (eigenaar, deadline, besluitnemer), een transcript-citaat, en verificatie-status. Je kunt zoeken op meeting ID of op titel.",
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
    iconName: "CheckCircle2",
    name: "get_decisions",
    description: "Besluiten uit meetings met bronvermelding",
    simpleExplanation:
      "Haalt alle besluiten op die uit meetings zijn geextraheerd. Elk besluit toont wie het besluit nam (made_by), de bron-meeting met datum, een transcript-citaat, en verificatie-status: 'AI (confidence: X%)' of 'Geverifieerd' als iemand het heeft nagekeken.",
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
    iconName: "ListChecks",
    name: "get_action_items",
    description: "Actiepunten met eigenaar, deadline en bronvermelding",
    simpleExplanation:
      "Haalt alle actiepunten op die uit meetings zijn geextraheerd. Elk actiepunt toont de eigenaar (assignee), deadline, bron-meeting met datum, een transcript-citaat, en verificatie-status. Je kunt filteren op persoon (zoekt in inhoud en metadata) of op project.",
    parameters: [
      {
        name: "person",
        description: "Filter op naam (matcht in inhoud en assignee)",
        required: false,
      },
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
    iconName: "Building2",
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
    iconName: "FolderKanban",
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
    iconName: "Users",
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

export const seedSection = {
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
  ] satisfies SeedCategory[],
};

export const roadmapItems: RoadmapItem[] = [
  {
    sprint: "Sprint 1",
    title: "Database tabellen",
    status: "live",
    description: "Alle tabellen, relaties en triggers aangemaakt",
  },
  {
    sprint: "Sprint 2",
    title: "Indexes, zoeken en embeddings",
    status: "live",
    description: "Vector + full-text search, Cohere embed-v4, seed data",
  },
  {
    sprint: "Sprint 3",
    title: "MCP Server + Tools",
    status: "live",
    description:
      "7 tools: search, meetings, besluiten, actiepunten, organisaties, projecten, mensen",
  },
  {
    sprint: "Sprint 4",
    title: "Fireflies webhook + Gatekeeper",
    status: "live",
    description: "Meetings automatisch ontvangen, classificeren en opslaan",
  },
  {
    sprint: "Sprint 5",
    title: "Extractor + embedding pipeline",
    status: "live",
    description:
      "Volledige pipeline: Gatekeeper → Extractor → opslag → embedding. 23 extracties uit 1 meeting, alles direct doorzoekbaar.",
  },
  {
    sprint: "Sprint 6",
    title: "Bronvermelding + verificatie",
    status: "live",
    description:
      "Alle MCP tools tonen bronvermelding (meeting, datum, citaat), confidence scores, verificatie-status en metadata (eigenaar, deadline, besluitnemer).",
  },
  {
    sprint: "Sprint 7",
    title: "Overzicht-tools + correctie",
    status: "gepland",
    description:
      "Organisatie-overzichten, meeting-filtering, extractie-correcties en usage tracking. v1 launch.",
  },
];

export const testResults: TestResult[] = [
  {
    test: "Volledige pipeline: Gatekeeper → Extractor → opslag → embedding",
    result: "1 meeting → 23 extracties → alles geembed en doorzoekbaar",
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
  {
    test: "search_knowledge bronvermelding (Sprint 6)",
    result:
      "Resultaten tonen bron (meeting titel + datum), transcript-citaat en verificatie-status",
    pass: true,
  },
  {
    test: "get_decisions metadata (Sprint 6)",
    result: "Besluiten tonen made_by, confidence en verificatie-status",
    pass: true,
  },
  {
    test: "get_action_items metadata (Sprint 6)",
    result: "Actiepunten tonen assignee, deadline, en person-filter werkt op metadata",
    pass: true,
  },
  {
    test: "Sufficiency check (Sprint 6)",
    result:
      "MCP system prompt versterkt: geen antwoord zonder bron, eerlijk bij ontbrekende data",
    pass: true,
  },
];
