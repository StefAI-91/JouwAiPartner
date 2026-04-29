import { CircleDot, Inbox, CheckCircle2, Loader2, XCircle, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  status: string;
  icon: LucideIcon;
  accent?: boolean;
  /** Tailwind text-color class voor het icoon wanneer dit menu-item actief is. */
  activeIconClass: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Triage",
    status: "triage",
    icon: Inbox,
    accent: true,
    activeIconClass: "text-orange-500",
  },
  { label: "Backlog", status: "backlog", icon: CircleDot, activeIconClass: "text-slate-500" },
  { label: "Te doen", status: "todo", icon: CircleDot, activeIconClass: "text-blue-500" },
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
