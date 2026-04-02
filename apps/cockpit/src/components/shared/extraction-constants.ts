import { Gavel, ListChecks, Sparkles, Lightbulb } from "lucide-react";

export const EXTRACTION_TYPE_ORDER = ["decision", "action_item", "need", "insight"];

export const EXTRACTION_TYPE_LABELS: Record<string, string> = {
  decision: "Decisions",
  action_item: "Action Items",
  need: "Needs",
  insight: "Insights",
};

export const EXTRACTION_TYPE_ICONS: Record<string, typeof Gavel> = {
  decision: Gavel,
  action_item: ListChecks,
  need: Sparkles,
  insight: Lightbulb,
};

export const EXTRACTION_TYPE_COLORS: Record<string, { label: string; color: string; bg: string }> =
  {
    decision: { label: "Decision", color: "#3B82F6", bg: "#DBEAFE" },
    action_item: { label: "Action Item", color: "#16A34A", bg: "#DCFCE7" },
    need: { label: "Need", color: "#A855F7", bg: "#F3E8FF" },
    insight: { label: "Insight", color: "#6B7280", bg: "#F3F4F6" },
  };
