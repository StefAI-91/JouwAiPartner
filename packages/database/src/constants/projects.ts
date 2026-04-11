export const SALES_STEPS = ["lead", "discovery", "proposal", "negotiation", "won"] as const;
export const DELIVERY_STEPS = ["kickoff", "in_progress", "review", "completed"] as const;
export const OTHER_STEPS = ["on_hold", "lost", "maintenance"] as const;

export const ALL_STEPS = [...SALES_STEPS, ...DELIVERY_STEPS, ...OTHER_STEPS];

export const PROJECT_STATUSES = [...ALL_STEPS, "active"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  lead: "Lead",
  discovery: "Kennismaking",
  proposal: "Offerte",
  negotiation: "Onderhandeling",
  won: "Gewonnen",
  kickoff: "Kickoff",
  in_progress: "In uitvoering",
  review: "Review",
  completed: "Afgerond",
  on_hold: "On hold",
  lost: "Verloren",
  maintenance: "Onderhoud",
  active: "Actief",
};

export function getPhaseSteps(status: string) {
  if ((SALES_STEPS as readonly string[]).includes(status)) return SALES_STEPS;
  if ((DELIVERY_STEPS as readonly string[]).includes(status)) return DELIVERY_STEPS;
  if ((OTHER_STEPS as readonly string[]).includes(status)) return OTHER_STEPS;
  return SALES_STEPS;
}
