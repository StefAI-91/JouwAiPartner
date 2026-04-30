import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

export type WeeklyStatus = "groen" | "oranje" | "rood";

export interface ProjectHealth {
  project_id: string;
  project_name: string;
  status: WeeklyStatus;
  summary: string;
  risks: string[];
  recommendations: string[];
}

export interface WeeklySummaryData {
  week_start: string;
  week_end: string;
  management_summary: string;
  project_health: ProjectHealth[];
  cross_project_risks: string[];
  team_insights: string[];
  focus_next_week: string[];
}

export interface StatusStyle {
  icon: typeof AlertCircle;
  dot: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  label: string;
  ringHover: string;
  expandBg: string;
}

export const STATUS_CONFIG: Record<WeeklyStatus, StatusStyle> = {
  rood: {
    icon: AlertTriangle,
    dot: "bg-red-500",
    border: "border-red-200/60",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    label: "Risico",
    ringHover: "hover:ring-red-200",
    expandBg: "bg-red-50/30",
  },
  oranje: {
    icon: AlertCircle,
    dot: "bg-amber-500",
    border: "border-amber-200/60",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    label: "Aandacht",
    ringHover: "hover:ring-amber-200",
    expandBg: "bg-amber-50/30",
  },
  groen: {
    icon: CheckCircle2,
    dot: "bg-emerald-500",
    border: "border-emerald-200/60",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    label: "Op koers",
    ringHover: "hover:ring-emerald-200",
    expandBg: "bg-emerald-50/30",
  },
};
