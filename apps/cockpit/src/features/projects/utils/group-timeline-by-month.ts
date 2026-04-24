import type { TimelineEntry } from "@repo/ai/validations/project-summary";

export interface TimelineMonthGroup {
  month: string;
  label: string;
  entries: TimelineEntry[];
}

const MONTH_LABELS_NL = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const idx = Number(month) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${MONTH_LABELS_NL[idx]} ${year}`;
}

export function groupTimelineByMonth(entries: TimelineEntry[]): TimelineMonthGroup[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const groups = new Map<string, TimelineEntry[]>();

  for (const entry of sorted) {
    const key = monthKey(entry.date);
    const bucket = groups.get(key);
    if (bucket) bucket.push(entry);
    else groups.set(key, [entry]);
  }

  return Array.from(groups.entries()).map(([month, groupEntries]) => ({
    month,
    label: monthLabel(month),
    entries: groupEntries,
  }));
}
