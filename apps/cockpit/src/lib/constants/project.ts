export const SALES_STEPS = ["lead", "discovery", "proposal", "negotiation", "won"] as const;
export const DELIVERY_STEPS = ["kickoff", "in_progress", "review", "completed"] as const;
export const OTHER_STEPS = ["on_hold", "lost", "maintenance"] as const;

export const ALL_STEPS = [...SALES_STEPS, ...DELIVERY_STEPS, ...OTHER_STEPS];

export const PROJECT_STATUSES = [
  "lead",
  "discovery",
  "proposal",
  "negotiation",
  "won",
  "kickoff",
  "in_progress",
  "review",
  "completed",
  "on_hold",
  "lost",
  "maintenance",
  "active",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  kickoff: "Kickoff",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
  on_hold: "On Hold",
  lost: "Lost",
  maintenance: "Maintenance",
  active: "Active",
};

export function getPhaseSteps(status: string) {
  if ((SALES_STEPS as readonly string[]).includes(status)) return SALES_STEPS;
  if ((DELIVERY_STEPS as readonly string[]).includes(status)) return DELIVERY_STEPS;
  if ((OTHER_STEPS as readonly string[]).includes(status)) return OTHER_STEPS;
  return SALES_STEPS;
}
