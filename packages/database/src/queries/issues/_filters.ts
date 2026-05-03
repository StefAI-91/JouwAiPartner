/**
 * Shared filter-helpers voor `listIssues` en `countFilteredIssues`. CC-008
 * extractie: de twee functies hadden subtiel divergerende logica voor
 * `assignedTo` (CC-003 should-fix b) — door de filter-laag te delen kan dat
 * nooit meer drift veroorzaken.
 */

import { UNASSIGNED_SENTINEL } from "../../constants/issues";

// UUID v4/v1 shape — same regex as auth.users.id. Used as a last-line-of-
// defence filter before uuids enter a raw `.or(...)` template so a crafted
// URL param can't break out of the quoted list and inject extra filters.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// `query` is opzettelijk losjes getypeerd — Supabase's PostgREST builder-types
// zijn fluent en wisselen per chained method. We willen hier alleen het
// filter-pattern delen, niet het type system aan banden leggen.
//
// `applyAssignedToFilter` retourneert de aangepaste query zodat de caller
// hem kan blijven chainen: `query = applyAssignedToFilter(query, ...)`.
type Filterable = {
  or: (s: string) => Filterable;
  is: (col: string, v: null) => Filterable;
  in: (col: string, vals: string[]) => Filterable;
  eq: (col: string, v: string) => Filterable;
};

export function applyAssignedToFilter<Q>(query: Q, assignedTo: string[] | undefined): Q {
  if (!assignedTo || assignedTo.length === 0) return query;

  const q = query as unknown as Filterable;
  const wantsUnassigned = assignedTo.includes(UNASSIGNED_SENTINEL);
  const uuids = assignedTo.filter((v) => v !== UNASSIGNED_SENTINEL && UUID_RE.test(v));

  // Mix of "unassigned" + specific people: OR them together. Uuids are
  // regex-validated above so the quoted list can't be escaped.
  if (wantsUnassigned && uuids.length > 0) {
    const inList = uuids.map((u) => `"${u}"`).join(",");
    return q.or(`assigned_to.is.null,assigned_to.in.(${inList})`) as unknown as Q;
  }
  if (wantsUnassigned) {
    return q.is("assigned_to", null) as unknown as Q;
  }
  if (uuids.length > 0) {
    return q.in("assigned_to", uuids) as unknown as Q;
  }

  // Neither wantsUnassigned nor any valid uuid → all values were garbage.
  // Returning without filter would silently widen the result set, so force
  // an empty match instead. Same fallback in list + count keeps the two
  // functions in lockstep (CC-003 should-fix b).
  return q.eq("assigned_to", "00000000-0000-0000-0000-000000000000") as unknown as Q;
}

/**
 * Parse a raw search query into either an exact `issue_number` lookup or a
 * free-text search. `"#464"`, `"464"`, `" #464 "` all return an issue-number
 * match; anything containing non-digit characters falls through to ilike on
 * title/description. Used by the issues page and the CSV export route so
 * both entry points handle `#<n>` identically.
 */
export function parseSearchQuery(raw: string | undefined | null): {
  issueNumber?: number;
  search?: string;
} {
  if (!raw) return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const numberMatch = trimmed.match(/^#?(\d+)$/);
  if (numberMatch) {
    const n = Number(numberMatch[1]);
    if (Number.isSafeInteger(n) && n > 0) return { issueNumber: n };
  }
  return { search: trimmed };
}

/** Sanitize ilike-search to escape PostgREST special characters. */
export function sanitizeIlikeQuery(raw: string): string {
  return raw.replace(/[%_\\,().]/g, (ch) => `\\${ch}`);
}
