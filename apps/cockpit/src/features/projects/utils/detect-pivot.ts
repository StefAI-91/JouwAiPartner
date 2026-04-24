import type { TimelineEntry } from "@repo/ai/validations/project-summary";

const PIVOT_MEETING_TYPES = new Set(["kickoff", "strategy", "review"]);
const MIN_DECISIONS_FOR_PIVOT = 3;

export function detectPivot(entry: TimelineEntry): boolean {
  if (entry.meeting_type && PIVOT_MEETING_TYPES.has(entry.meeting_type)) {
    return true;
  }
  return entry.key_decisions.length >= MIN_DECISIONS_FOR_PIVOT;
}
