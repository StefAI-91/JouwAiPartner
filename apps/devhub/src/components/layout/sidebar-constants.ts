import { CircleDot, Inbox, CheckCircle2, Loader2, XCircle, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  status: string;
  icon: LucideIcon;
  accent?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Triage", status: "triage", icon: Inbox, accent: true },
  { label: "Backlog", status: "backlog", icon: CircleDot },
  { label: "Te doen", status: "todo", icon: CircleDot },
  { label: "In behandeling", status: "in_progress", icon: Loader2 },
  { label: "Afgerond", status: "done", icon: CheckCircle2 },
  { label: "Geannuleerd", status: "cancelled", icon: XCircle },
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
