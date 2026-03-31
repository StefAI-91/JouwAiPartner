export interface RoadmapItem {
  sprint: string;
  title: string;
  status: "live" | "gepland";
  description: string;
}

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
      "Volledige pipeline: Gatekeeper \u2192 Extractor \u2192 opslag \u2192 embedding. 23 extracties uit 1 meeting, alles direct doorzoekbaar.",
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
