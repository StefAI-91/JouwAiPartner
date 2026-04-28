/**
 * Niet-publieke helpers gedeeld tussen `issues.ts` en `project.ts` in deze
 * cluster. Niet re-geëxporteerd via `index.ts` — sub-files importeren via
 * `./internals`.
 */

export interface PaginatedResult<T> {
  rows: T[];
  totalCount: number;
}

/**
 * Bereken ISO-cutoff voor `days_back` dagen terug vanaf nu. Wordt gebruikt als
 * drempel in de OR-filter op `created_at`, `updated_at` en `closed_at`.
 */
export function cutoffIsoFromDaysBack(daysBack: number): string {
  return new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
}

export const REPORT_ISSUE_SELECT = `
  id, issue_number, title, description, type, status, priority, component, severity,
  labels, source, source_url, reporter_name, reporter_email, assigned_to,
  created_at, updated_at, closed_at,
  assigned_person:assigned_to (id, full_name)
` as const;

export interface RawIssueWithAssigned {
  id: string;
  issue_number: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  severity: string | null;
  labels: string[] | null;
  source: string;
  source_url: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  assigned_person: { id: string; full_name: string | null } | null;
}

export interface IssueReportRow {
  id: string;
  issue_number: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  severity: string | null;
  labels: string[];
  source: string;
  source_url: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export function mapIssueRow(row: RawIssueWithAssigned): IssueReportRow {
  return {
    id: row.id,
    issue_number: row.issue_number,
    title: row.title,
    description: row.description,
    type: row.type,
    status: row.status,
    priority: row.priority,
    component: row.component,
    severity: row.severity,
    labels: row.labels ?? [],
    source: row.source,
    source_url: row.source_url,
    reporter_name: row.reporter_name,
    reporter_email: row.reporter_email,
    assigned_to_id: row.assigned_to,
    assigned_to_name: row.assigned_person?.full_name ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    closed_at: row.closed_at,
  };
}
