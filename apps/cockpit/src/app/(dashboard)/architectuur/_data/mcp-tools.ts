import {
  Search,
  MessageSquare,
  CheckCircle2,
  ListChecks,
  Building2,
  FolderKanban,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ToolInfo {
  icon: LucideIcon;
  name: string;
  description: string;
  simpleExplanation: string;
  parameters: { name: string; description: string; required: boolean }[];
  exampleQuestions: string[];
}

export const mcpTools: ToolInfo[] = [
  {
    icon: Search,
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
    icon: MessageSquare,
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
    icon: CheckCircle2,
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
    icon: ListChecks,
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
      "Wie werkt er bij Jouw AI Partner?",
      "Wie zit er in het engineering team?",
      "Toon alle mede-eigenaren",
    ],
  },
];
