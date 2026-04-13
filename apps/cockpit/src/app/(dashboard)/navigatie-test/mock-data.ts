/**
 * Mock data voor de MVP navigatie-test.
 *
 * Strikt: alleen de velden die nodig zijn om een snelkoppeling weer te geven.
 * Actions, health, meetings, deadlines — niets daarvan.
 * Toekomstige verrijking komt later, als we weten dat het nut heeft.
 */

export type DeliveryPhase = "kickoff" | "in_progress" | "review" | "maintenance";

export interface FocusProjectMvp {
  id: string;
  name: string;
  organization: string;
  phase: DeliveryPhase;
}

/**
 * Lijst, gesorteerd op `updated_at DESC` zoals de echte query dat zou doen.
 * Beperkt tot max 5 — de sidebar moet compact blijven.
 */
export const focusProjectsMvp: FocusProjectMvp[] = [
  {
    id: "p1",
    name: "Flowwijs MVP",
    organization: "Flowwijs",
    phase: "in_progress",
  },
  {
    id: "p2",
    name: "CAI Studio",
    organization: "Creative AI Partners",
    phase: "in_progress",
  },
  {
    id: "p3",
    name: "Rinkel VoIP pipeline",
    organization: "Intern",
    phase: "kickoff",
  },
  {
    id: "p4",
    name: "Klantportaal MVP",
    organization: "Intern",
    phase: "in_progress",
  },
  {
    id: "p5",
    name: "Weekly Summarizer v2",
    organization: "Intern",
    phase: "maintenance",
  },
];

/**
 * De échte query in productie — minimaal, één tabel + één join.
 */
export const productionQuery = `SELECT
  p.id, p.name,
  o.name AS organization
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.status IN ('kickoff', 'in_progress', 'review', 'maintenance')
ORDER BY p.updated_at DESC
LIMIT 5;`;

/**
 * Wat de MVP gebruikt — drie velden, uit twee tabellen.
 */
export const signals = [
  {
    label: "Delivery-fase",
    source: "projects.status",
    usage: "Filter: alleen actieve delivery-projecten",
  },
  {
    label: "Momentum",
    source: "projects.updated_at",
    usage: "Sortering (DESC) — recentste activiteit bovenaan",
  },
  {
    label: "Naam + organisatie",
    source: "projects.name + organizations.name",
    usage: "Weergave — dat is het hele ding",
  },
] as const;

/**
 * Alles wat we NIET doen. Bewust. Geparkeerd tot iemand zegt: dit mis ik.
 */
export const parked = [
  {
    label: "Openstaande actie-count",
    reason:
      "Filtering van action_items is nog niet scherp — niet alle zijn even relevant of actueel. Eerst zien of de snelkoppeling zelf voldoet.",
  },
  {
    label: "Gezondheidsindicator (rood/oranje/groen)",
    reason:
      "Afhankelijk van wekelijkse summary die niet elk project heeft. Ruis zolang het niet 100% gevuld is.",
  },
  {
    label: "Laatste-meeting indicator",
    reason:
      "Nuttig als context maar voegt visuele ruis toe. Pas interessant als iemand zegt: 'ik wil zien wanneer ik dit project bijwerkte'.",
  },
  {
    label: "Deadline-badge",
    reason:
      "Niet elk project heeft een deadline gezet. Toon je een badge, dan suggereer je dat de afwezigheid betekenis heeft.",
  },
  {
    label: "AI-gegenereerde reden",
    reason: "Vereist Project Summarizer per render. Overkill voor een link.",
  },
  {
    label: "Per-user personalisatie",
    reason: "3 mensen, zelfde lijst is prima.",
  },
] as const;
