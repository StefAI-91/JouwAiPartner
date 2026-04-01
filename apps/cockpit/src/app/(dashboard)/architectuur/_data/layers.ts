import { Database, Search, Brain, Mic, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface LayerProps {
  icon: LucideIcon;
  title: string;
  sprint: string;
  status: "live" | "gepland";
  simpleExplanation: string;
  technicalDetails: string[];
  tables?: string[];
}

export const layers: LayerProps[] = [
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
      "Elke meeting doorloopt een pipeline. Eerst worden deelnemers herkend als intern of extern via de people-tabel. Dan bepaalt de pipeline automatisch het party_type (client/partner/internal). De Gatekeeper AI classificeert het meeting type en relevantie. De Extractor haalt besluiten, actiepunten en inzichten eruit.",
    technicalDetails: [
      "Participant classifier: matcht deelnemers op email/naam tegen people-tabel, fallback op @jouwaipartner.nl/@jaip.nl domeinen",
      "Party type: deterministisch bepaald uit organizations.type (client/partner) — niet door AI",
      "Gatekeeper (Claude Haiku 4.5): classificeert meeting_type en relevance_score (0.0-1.0)",
      "9 meeting types: strategy, one_on_one, team_sync, discovery, sales, project_kickoff, status_update, collaboration, other",
      "Extractor (Claude Sonnet 4.5): haalt decisions, action_items, needs, insights eruit met confidence score en transcript_ref",
      "Transcript_ref validatie: exacte quote-check tegen transcript, confidence → 0.0 bij mismatch",
      "Meeting-type-specifieke extractie-instructies (sales → needs, strategy → decisions, etc.)",
      "Entity resolution: koppelt genoemde organisaties/projecten aan de database (exact → alias → embedding match)",
      "Inline embedding na pipeline: meeting + extracties direct doorzoekbaar via Cohere embed-v4",
      "raw_fireflies JSONB: volledige audit trail van participant classificatie + Gatekeeper + Extractor output",
      "Alles wordt opgeslagen — niets wordt weggegooid. Onzekere content krijgt lage confidence.",
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
      "people — teamleden en contactpersonen (met organization_id voor extern-classificatie)",
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
