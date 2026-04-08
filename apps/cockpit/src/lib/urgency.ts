export type Urgency = "overdue" | "this-week" | "default";

export function getUrgency(dueDateStr: string | null): Urgency {
  if (!dueDateStr) return "default";
  const due = new Date(dueDateStr);
  const now = new Date();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = (dueMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "this-week";
  return "default";
}
