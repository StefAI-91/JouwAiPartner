import { CircleDot, Inbox, CheckCircle2, Loader2, XCircle, type LucideIcon } from "lucide-react";

export interface PriorityNavItem {
  label: string;
  priority: "p1" | "p2" | "nice_to_have";
  /** Kleur van het bulletje voor deze prio. */
  dotClass: string;
}

export interface NavItem {
  label: string;
  status: string;
  icon: LucideIcon;
  accent?: boolean;
  /** Tailwind text-color class voor het icoon wanneer dit menu-item actief is. */
  activeIconClass: string;
  /**
   * Sub-links per prio. Alleen aanwezig op statussen waar de IA-discussie
   * heeft besloten dat prio-uitsplitsing zinvol is (Te doen + Backlog). Op de
   * andere statussen blijft het menu plat.
   */
  prioritySubItems?: PriorityNavItem[];
}

const PRIORITY_SUB_ITEMS: PriorityNavItem[] = [
  { label: "P1", priority: "p1", dotClass: "bg-red-500" },
  { label: "P2", priority: "p2", dotClass: "bg-amber-500" },
  { label: "Nice to have", priority: "nice_to_have", dotClass: "bg-muted-foreground/40" },
];

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Triage",
    status: "triage",
    icon: Inbox,
    accent: true,
    activeIconClass: "text-orange-500",
  },
  {
    label: "Backlog",
    status: "backlog",
    icon: CircleDot,
    activeIconClass: "text-slate-500",
    prioritySubItems: PRIORITY_SUB_ITEMS,
  },
  {
    label: "Te doen",
    status: "todo",
    icon: CircleDot,
    activeIconClass: "text-blue-500",
    prioritySubItems: PRIORITY_SUB_ITEMS,
  },
  {
    label: "In behandeling",
    status: "in_progress",
    icon: Loader2,
    activeIconClass: "text-amber-500",
  },
  {
    label: "Afgerond",
    status: "done",
    icon: CheckCircle2,
    activeIconClass: "text-green-600",
  },
  {
    label: "Geannuleerd",
    status: "cancelled",
    icon: XCircle,
    activeIconClass: "text-red-500",
  },
];

/**
 * Build an issues href that preserves the ?project= param and adds extra params.
 */
export function issueHref(projectId: string | null, extraParams?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (projectId) params.set("project", projectId);
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/issues?${qs}` : "/issues";
}
