export interface ProjectProgress {
  percent: number;
  daysRemaining: number;
  status: "before" | "in_progress" | "overdue";
}

export function formatProjectProgress(
  start: string | null,
  deadline: string | null,
  today: Date = new Date(),
): ProjectProgress | null {
  if (!start || !deadline) return null;

  const startTime = new Date(start).getTime();
  const deadlineTime = new Date(deadline).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(deadlineTime)) return null;
  if (deadlineTime <= startTime) return null;

  // Normaliseer op UTC-midnight. YYYY-MM-DD ISO-strings worden door de Date-
  // constructor al als UTC-midnight geparsed, dus `today` op lokale tijd zou
  // tijdzone-drift introduceren in `daysRemaining` (Math.ceil rondt 5.08 op
  // tot 6 in Europe/Amsterdam). UTC houdt de berekening deterministisch.
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  const totalSpan = deadlineTime - startTime;
  const elapsed = now - startTime;
  const rawPercent = (elapsed / totalSpan) * 100;
  const percent = Math.max(0, Math.min(100, Math.round(rawPercent)));

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil((deadlineTime - now) / msPerDay);

  let status: ProjectProgress["status"];
  if (now < startTime) status = "before";
  else if (now > deadlineTime) status = "overdue";
  else status = "in_progress";

  return { percent, daysRemaining, status };
}
