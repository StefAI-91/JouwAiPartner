/**
 * Portal-specifieke vertaling van interne DevHub issue-statussen naar
 * klantvriendelijke labels en kleuren. De interne statussen worden volgens
 * `docs/specs/portal-mvp.md` sectie 6 gegroepeerd in 4 portal-buckets.
 */

export const PORTAL_STATUS_GROUPS = [
  "Ontvangen",
  "Ingepland",
  "In behandeling",
  "Afgerond",
] as const;

export type PortalStatusGroup = (typeof PORTAL_STATUS_GROUPS)[number];

export const STATUS_MAP: Record<string, PortalStatusGroup> = {
  triage: "Ontvangen",
  backlog: "Ingepland",
  todo: "Ingepland",
  in_progress: "In behandeling",
  done: "Afgerond",
  cancelled: "Afgerond",
};

export const STATUS_COLORS: Record<PortalStatusGroup, string> = {
  Ontvangen: "bg-blue-50 text-blue-700 border-blue-200",
  Ingepland: "bg-amber-50 text-amber-700 border-amber-200",
  "In behandeling": "bg-violet-50 text-violet-700 border-violet-200",
  Afgerond: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

/**
 * Vertaal een interne issue-status naar het portal-label. Valt terug op de
 * input zelf bij een onbekende status, zodat we niets stilletjes verliezen.
 */
export function translateStatus(internalStatus: string): string {
  return STATUS_MAP[internalStatus] ?? internalStatus;
}
