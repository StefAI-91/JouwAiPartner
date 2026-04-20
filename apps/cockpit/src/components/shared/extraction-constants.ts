import { AlertTriangle, ListChecks, Lightbulb } from "lucide-react";

export const EXTRACTION_TYPE_ORDER = ["risk", "action_item", "need"];

export const EXTRACTION_TYPE_LABELS: Record<string, string> = {
  risk: "Risico's",
  action_item: "Actiepunten",
  need: "Behoeftes",
};

export const EXTRACTION_TYPE_ICONS: Record<string, typeof ListChecks> = {
  risk: AlertTriangle,
  action_item: ListChecks,
  need: Lightbulb,
};

export const EXTRACTION_TYPE_COLORS: Record<string, { label: string; color: string; bg: string }> =
  {
    risk: { label: "Risico", color: "#DC2626", bg: "#FEE2E2" },
    action_item: { label: "Actiepunt", color: "#16A34A", bg: "#DCFCE7" },
    need: { label: "Behoefte", color: "#7C3AED", bg: "#F3E8FF" },
  };

export const CATEGORY_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  // Legacy action-item categories (existing data)
  wij_leveren: { label: "Wij leveren", color: "#1D4ED8", bg: "#DBEAFE" },
  wij_volgen_op: { label: "Wij volgen op", color: "#B45309", bg: "#FEF3C7" },
  // New action-item categories
  wachten_op_extern: { label: "Wachten op extern", color: "#B45309", bg: "#FEF3C7" },
  wachten_op_beslissing: { label: "Wachten op beslissing", color: "#7C3AED", bg: "#F3E8FF" },
};

/**
 * Severity-badge voor risks. Rood = critical, oranje = high, amber = medium,
 * grijs = low. Bewust ordinale kleur-gradatie zodat reviewers bij één oogopslag
 * zien waar urgentie zit.
 */
export const RISK_SEVERITY_BADGES: Record<
  string,
  { label: string; color: string; bg: string; rank: number }
> = {
  critical: { label: "Critical", color: "#B91C1C", bg: "#FEE2E2", rank: 0 },
  high: { label: "High", color: "#C2410C", bg: "#FFEDD5", rank: 1 },
  medium: { label: "Medium", color: "#B45309", bg: "#FEF3C7", rank: 2 },
  low: { label: "Low", color: "#525252", bg: "#F5F5F5", rank: 3 },
};

export const RISK_CATEGORY_LABELS: Record<string, string> = {
  financial: "Financieel",
  scope: "Scope",
  technical: "Technisch",
  client_relationship: "Klantrelatie",
  team: "Team",
  timeline: "Timeline",
  strategic: "Strategisch",
  reputation: "Reputatie",
};

export const RISK_IMPACT_AREA_LABELS: Record<string, string> = {
  delivery: "Levering",
  margin: "Marge",
  strategy: "Strategie",
  client: "Klant",
  team: "Team",
  reputation: "Reputatie",
};
