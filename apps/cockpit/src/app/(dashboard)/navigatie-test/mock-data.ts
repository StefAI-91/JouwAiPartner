/**
 * Mock data voor de MVP navigatie-test.
 * Reflecteert exact wat vandaag al in de database staat:
 * projects.name/status/updated_at/deadline, organizations.name,
 * people.name (owner), aggregated last_meeting_date en open_action_count,
 * en optioneel weekly_summary.status wanneer de week is gedraaid.
 *
 * Geen AI-reden. Geen scoring. Geen scenarios.
 */

export type HealthStatus = "rood" | "oranje" | "groen";
export type DeliveryPhase = "kickoff" | "in_progress" | "review" | "maintenance";

export interface FocusProjectMvp {
  id: string;
  name: string;
  organization: string;
  /** projects.status — filter: alleen delivery-fases verschijnen in focus */
  phase: DeliveryPhase;
  /** weekly_summary.status — kan ontbreken als Weekly Summarizer nog niet liep */
  health: HealthStatus | null;
  /** Aggregatie op extractions.type = action_item */
  openActions: number;
  /** Relatieve tijd sinds laatste gekoppelde meeting — kan ontbreken */
  lastMeetingRelative: string | null;
  /** Relatieve tijd sinds projects.updated_at — altijd beschikbaar */
  updatedRelative: string;
  /** people.name via projects.owner_id — kan ontbreken */
  owner: string | null;
  /** projects.deadline — kan ontbreken */
  deadlineRelative: string | null;
}

/**
 * Vaste lijst, gesorteerd op `updated_at DESC` zoals de echte query.
 * Geen scenarios — één statische lijst die productie-realistisch is.
 */
export const focusProjectsMvp: FocusProjectMvp[] = [
  {
    id: "p1",
    name: "Flowwijs MVP",
    organization: "Flowwijs",
    phase: "in_progress",
    health: "rood",
    openActions: 6,
    lastMeetingRelative: "vandaag",
    updatedRelative: "3 uur geleden",
    owner: "Stef",
    deadlineRelative: null,
  },
  {
    id: "p2",
    name: "CAI Studio",
    organization: "Creative AI Partners",
    phase: "in_progress",
    health: "oranje",
    openActions: 3,
    lastMeetingRelative: "2 dagen geleden",
    updatedRelative: "gisteren",
    owner: "Stef",
    deadlineRelative: "vrijdag",
  },
  {
    id: "p3",
    name: "Rinkel VoIP pipeline",
    organization: "Intern",
    phase: "kickoff",
    health: null, // nog geen weekly summary
    openActions: 1,
    lastMeetingRelative: null,
    updatedRelative: "1 dag geleden",
    owner: "Ege",
    deadlineRelative: null,
  },
  {
    id: "p4",
    name: "Klantportaal MVP",
    organization: "Intern",
    phase: "in_progress",
    health: "groen",
    openActions: 2,
    lastMeetingRelative: "1 week geleden",
    updatedRelative: "4 dagen geleden",
    owner: "Stef",
    deadlineRelative: "3 weken",
  },
  {
    id: "p5",
    name: "Weekly Summarizer v2",
    organization: "Intern",
    phase: "maintenance",
    health: null,
    openActions: 0,
    lastMeetingRelative: null,
    updatedRelative: "2 weken geleden",
    owner: "Wouter",
    deadlineRelative: null,
  },
];

/**
 * De échte query die dit voedt in productie.
 * Puur voor weergave in het "Hoe werkt het" paneel.
 */
export const productionQuery = `SELECT
  p.id, p.name, p.status, p.deadline, p.updated_at,
  o.name AS organization,
  owner.name AS owner_name,
  ws.status AS health,
  COUNT(DISTINCT e.id) FILTER (WHERE e.type = 'action_item') AS open_actions,
  MAX(m.date) AS last_meeting_date
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN people owner    ON owner.id = p.owner_id
LEFT JOIN weekly_summaries ws ON ws.project_id = p.id
                              AND ws.week = date_trunc('week', now())
LEFT JOIN extractions e   ON e.project_id = p.id
LEFT JOIN meeting_projects mp ON mp.project_id = p.id
LEFT JOIN meetings m      ON m.id = mp.meeting_id
WHERE p.status IN ('kickoff', 'in_progress', 'review', 'maintenance')
GROUP BY p.id, o.name, owner.name, ws.status
ORDER BY p.updated_at DESC
LIMIT 5;`;

/**
 * Signalen die we vandaag gebruiken — alles komt uit een bestaande kolom.
 */
export const todaysSignals = [
  {
    label: "Delivery-fase",
    source: "projects.status",
    usage: "Filter: alleen kickoff / in_progress / review / maintenance",
    ready: true,
  },
  {
    label: "Momentum",
    source: "projects.updated_at",
    usage: "Primaire sortering (DESC)",
    ready: true,
  },
  {
    label: "Organisatie",
    source: "organizations.name",
    usage: "Secundair label onder projectnaam",
    ready: true,
  },
  {
    label: "Openstaande acties",
    source: "COUNT(extractions WHERE type = 'action_item')",
    usage: "Badge naast projectnaam",
    ready: true,
  },
  {
    label: "Laatste meeting",
    source: "MAX(meetings.date via meeting_projects)",
    usage: "Subline: 'meeting 2 dagen geleden'",
    ready: true,
  },
  {
    label: "Owner",
    source: "projects.owner_id → people.name",
    usage: "Optioneel label bij rich variant",
    ready: true,
  },
  {
    label: "Deadline",
    source: "projects.deadline",
    usage: "Subline als binnen 2 weken",
    ready: true,
  },
  {
    label: "Gezondheid",
    source: "weekly_summaries.status",
    usage: "Kleur-dot. Grijs als nog geen weekly summary",
    ready: true,
    note: "Alleen beschikbaar als Weekly Summarizer deze week liep",
  },
] as const;

/**
 * Expliciet NIET in de MVP — voor latere fases.
 */
export const notYet = [
  {
    label: "AI-gegenereerde reden",
    reason: "Vereist Project Summarizer-aanroep per render — duur en niet altijd verified",
    phase: "Fase 1",
  },
  {
    label: "Per-user personalisatie",
    reason: "3-persoons team — zelfde lijst is prima",
    phase: "Fase 2",
  },
  {
    label: "Scoring / ranking-formule",
    reason: "Eerst zien hoe sortering op updated_at voelt in de praktijk",
    phase: "Fase 2",
  },
  {
    label: "Klik-tracking als label-data",
    reason: "Pas zinvol wanneer we een ranker gaan tunen",
    phase: "Fase 3",
  },
  {
    label: "Tijd-van-de-dag gedrag",
    reason: "Cosmetisch — statisch per refresh is voldoende",
    phase: "Niet gepland",
  },
] as const;
