import type { IssueType, PortalSourceGroupKey } from "@repo/database/constants/issues";

interface IssuesHrefParams {
  source?: PortalSourceGroupKey | null;
  type?: IssueType | null;
}

/**
 * Bouw de canonieke `/projects/[id]/issues` URL met optionele query-params.
 * Gedeeld tussen `SourceSwitch` en `TypeFilter` zodat klikken op één tab
 * de andere actieve filter ongemoeid laat (orthogonale tabs, CP-008 §4).
 *
 * Gedrag:
 * - `null`/`undefined` value → param wordt weggelaten
 * - Volgorde van params is stabiel (`source` voor `type`) zodat URL's voor
 *   identieke filters niet uit elkaar lopen tussen entry points.
 */
export function buildIssuesHref(projectId: string, { source, type }: IssuesHrefParams): string {
  const params = new URLSearchParams();
  if (source) params.set("source", source);
  if (type) params.set("type", type);
  const qs = params.toString();
  const base = `/projects/${projectId}/issues`;
  return qs ? `${base}?${qs}` : base;
}
