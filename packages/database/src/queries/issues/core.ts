/**
 * CC-008 — `core.ts` is een re-export-barrel.
 *
 * De daadwerkelijke implementatie woont in:
 *   - `list.ts`    — listIssues, countFilteredIssues, parseSearchQuery, sort-helpers
 *   - `detail.ts`  — getIssueById, ISSUE_SELECT, IssueRow, UNASSIGNED_SENTINEL
 *   - `stats.ts`   — getIssueCounts, getWeeklyIssueIntake, countCriticalUnassigned
 *   - `_filters.ts` — interne shared filter-helpers (niet publiek)
 *
 * Bestaande callers die `from "./core"` of `from "@repo/database/queries/issues"`
 * importeren blijven zonder wijziging werken — de symbolen verlaten dit barrel
 * onveranderd.
 */

export * from "./list";
export * from "./detail";
export * from "./stats";
