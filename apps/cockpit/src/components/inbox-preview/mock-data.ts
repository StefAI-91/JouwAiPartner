/**
 * Mock fixtures voor de inbox-blueprint preview-pagina.
 *
 * Niet productie-data; uitsluitend visualisatie van CC-001 + CC-005 + CC-006
 * design-intentie. Geen DB-roundtrip, geen i18n — pure presentation.
 */

export type MockSource = "portal" | "userback" | "jaip_widget" | null;

export type MockInboxStatus =
  | "needs_pm_review"
  | "open_question"
  | "responded"
  | "deferred"
  | "converted_to_qa";

export type MockPortalStatus =
  | "ontvangen"
  | "in_behandeling"
  | "afgerond"
  | "geparkeerd"
  | "vervolgvraag";

export type SourceBadge = "client_pm" | "end_user" | null;

export interface MockProject {
  id: string;
  name: string;
  client: string;
}

export interface MockSender {
  name: string;
  role: "team" | "client";
  initial: string;
}

export interface CockpitItem {
  id: string;
  kind: "feedback" | "question" | "free_message";
  project: MockProject;
  source: MockSource;
  sourceBadge: SourceBadge;
  sender: MockSender;
  title?: string;
  body: string;
  status: MockInboxStatus;
  createdAt: string;
  thread?: { author: string; role: "team" | "client"; body: string; createdAt: string }[];
  draftPending?: boolean;
}

export interface PortalItem {
  id: string;
  kind: "feedback" | "team_message";
  project: MockProject;
  title?: string;
  body: string;
  fromTeam?: { name: string; initial: string };
  status: MockPortalStatus;
  declineReason?: string;
  createdAt: string;
}

export const MOCK_PROJECTS: Record<string, MockProject> = {
  acme: { id: "acme", name: "Acme Corp Website", client: "Acme Corp" },
  veldhoven: { id: "veldhoven", name: "Veldhoven AI Pilot", client: "Veldhoven Industries" },
  zonnehof: { id: "zonnehof", name: "Zonnehof CRM", client: "Zonnehof B.V." },
};

const MARIEKE: MockSender = { name: "Marieke van der Berg", role: "client", initial: "M" };
const ANON: MockSender = { name: "Eindgebruiker", role: "client", initial: "E" };
const STEF: MockSender = { name: "Stef Aerts", role: "team", initial: "S" };

export const COCKPIT_SECTIONS: Array<{ key: string; label: string; items: CockpitItem[] }> = [
  {
    key: "wacht_op_jou",
    label: "Wacht op jou",
    items: [
      {
        id: "ck-1",
        kind: "feedback",
        project: MOCK_PROJECTS.acme,
        source: "portal",
        sourceBadge: "client_pm",
        sender: MARIEKE,
        title: "Login is traag op mobiel",
        body: "Sinds gisteren duurt inloggen op iPhone meer dan 8 seconden. Op desktop werkt het normaal. Speelt bij meerdere collega's.",
        status: "needs_pm_review",
        createdAt: "2u",
      },
      {
        id: "ck-2",
        kind: "feedback",
        project: MOCK_PROJECTS.veldhoven,
        source: "userback",
        sourceBadge: "end_user",
        sender: ANON,
        title: "Dashboard dropdown werkt niet in Safari",
        body: "Klik op de filter-dropdown doet niks in Safari 17 — Chrome werkt prima.",
        status: "needs_pm_review",
        createdAt: "6u",
      },
      {
        id: "ck-3",
        kind: "question",
        project: MOCK_PROJECTS.acme,
        source: null,
        sourceBadge: null,
        sender: MARIEKE,
        body: "Wanneer kunnen we de roadmap-meeting voor Q3 inplannen? Graag voor het einde van deze maand.",
        status: "open_question",
        createdAt: "1d",
      },
    ],
  },
  {
    key: "wacht_op_klant",
    label: "Wacht op klant",
    items: [
      {
        id: "ck-4",
        kind: "free_message",
        project: MOCK_PROJECTS.zonnehof,
        source: null,
        sourceBadge: null,
        sender: STEF,
        body: "Hoi Tom — we zien drie kandidaten voor het Q1 CRM-blok. Welke heeft de hoogste prioriteit voor jullie sales-team?",
        status: "responded",
        createdAt: "3u",
        thread: [
          {
            author: "Stef Aerts",
            role: "team",
            body: "Drie kandidaten voor Q1: lead-scoring, e-mail-templates, of pipeline-export. Welke eerst?",
            createdAt: "gisteren",
          },
          {
            author: "Tom Hendriks",
            role: "client",
            body: "Lead-scoring wint met afstand. Sales is daar al maanden mee bezig.",
            createdAt: "3u",
          },
        ],
      },
    ],
  },
  {
    key: "geparkeerd",
    label: "Geparkeerd",
    items: [
      {
        id: "ck-5",
        kind: "feedback",
        project: MOCK_PROJECTS.acme,
        source: "portal",
        sourceBadge: "client_pm",
        sender: MARIEKE,
        title: "Donker thema toevoegen",
        body: "Nice-to-have voor avond-werk. Geen haast.",
        status: "deferred",
        createdAt: "5d",
      },
    ],
  },
];

export const PORTAL_ITEMS: PortalItem[] = [
  {
    id: "po-1",
    kind: "feedback",
    project: MOCK_PROJECTS.acme,
    title: "Login is traag op mobiel",
    body: "Sinds gisteren duurt inloggen op iPhone meer dan 8 seconden.",
    status: "ontvangen",
    createdAt: "2u",
  },
  {
    id: "po-2",
    kind: "team_message",
    project: MOCK_PROJECTS.acme,
    body: "Hoi Marieke — even kort: we ronden Q3 deze week af. Donderdag 14:00 evaluatie?",
    fromTeam: { name: "Stef Aerts", initial: "S" },
    status: "ontvangen",
    createdAt: "30m",
  },
  {
    id: "po-3",
    kind: "feedback",
    project: MOCK_PROJECTS.acme,
    title: "Bulk-import van klanten via CSV",
    body: "We hebben 4.200 historische records die in één keer naar binnen moeten.",
    status: "in_behandeling",
    createdAt: "3d",
  },
  {
    id: "po-4",
    kind: "feedback",
    project: MOCK_PROJECTS.acme,
    title: "Eigen domein voor het portal",
    body: "Zouden we het portal onder portaal.acme.nl kunnen draaien?",
    status: "afgerond",
    declineReason:
      "Niet realiseerbaar binnen huidige scope. We onthouden 't voor het 2027-roadmap-overleg.",
    createdAt: "1d",
  },
  {
    id: "po-5",
    kind: "feedback",
    project: MOCK_PROJECTS.acme,
    title: "Donker thema toevoegen",
    body: "Nice-to-have voor avond-werk.",
    status: "geparkeerd",
    createdAt: "5d",
  },
];
