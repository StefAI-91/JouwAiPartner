import { ListChecks, Lightbulb } from "lucide-react";

export const EXTRACTION_TYPE_ORDER = ["action_item", "need"];

export const EXTRACTION_TYPE_LABELS: Record<string, string> = {
  action_item: "Actiepunten",
  need: "Behoeftes",
};

export const EXTRACTION_TYPE_ICONS: Record<string, typeof ListChecks> = {
  action_item: ListChecks,
  need: Lightbulb,
};

export const EXTRACTION_TYPE_COLORS: Record<string, { label: string; color: string; bg: string }> =
  {
    action_item: { label: "Actiepunt", color: "#16A34A", bg: "#DCFCE7" },
    need: { label: "Behoefte", color: "#7C3AED", bg: "#F3E8FF" },
  };

export const CATEGORY_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  wij_leveren: { label: "Wij leveren", color: "#1D4ED8", bg: "#DBEAFE" },
  wij_volgen_op: { label: "Wij volgen op", color: "#B45309", bg: "#FEF3C7" },
};
