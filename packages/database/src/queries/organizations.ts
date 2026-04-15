import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import { getLatestSummary } from "./summaries";

export interface OrganizationListItem {
  id: string;
  name: string;
  type: string;
  status: string;
  contact_person: string | null;
  email: string | null;
  project_count: number;
  last_meeting_date: string | null;
}

/**
 * List all organizations with project count and last meeting date.
 */
export async function listOrganizations(
  client?: SupabaseClient,
  options?: { limit?: number },
): Promise<OrganizationListItem[]> {
  const db = client ?? getAdminClient();

  const { data: orgs, error } = await db
    .from("organizations")
    .select("id, name, type, status, contact_person, email")
    .order("name")
    .limit(options?.limit ?? 500);

  if (error || !orgs || orgs.length === 0) return [];

  const orgIds = orgs.map((o) => o.id);

  // Batch: project count per org
  const { data: projects } = await db
    .from("projects")
    .select("organization_id")
    .in("organization_id", orgIds);

  const projectCountMap = new Map<string, number>();
  if (projects) {
    for (const p of projects) {
      if (!p.organization_id) continue;
      projectCountMap.set(p.organization_id, (projectCountMap.get(p.organization_id) ?? 0) + 1);
    }
  }

  // Batch: last meeting date per org
  const { data: meetings } = await db
    .from("meetings")
    .select("organization_id, date")
    .in("organization_id", orgIds)
    .order("date", { ascending: false });

  const lastMeetingMap = new Map<string, string>();
  if (meetings) {
    for (const m of meetings) {
      if (!m.organization_id || !m.date) continue;
      if (!lastMeetingMap.has(m.organization_id)) {
        lastMeetingMap.set(m.organization_id, m.date);
      }
    }
  }

  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    type: o.type,
    status: o.status,
    contact_person: o.contact_person,
    email: o.email,
    project_count: projectCountMap.get(o.id) ?? 0,
    last_meeting_date: lastMeetingMap.get(o.id) ?? null,
  }));
}

export interface OrganizationDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  contact_person: string | null;
  email: string | null;
  email_domains: string[];
  projects: {
    id: string;
    name: string;
    status: string;
  }[];
  meetings: {
    id: string;
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    verification_status: string;
  }[];
  context_summary: { content: string; version: number; created_at: string } | null;
  briefing_summary: {
    content: string;
    version: number;
    created_at: string;
    structured_content: Record<string, unknown> | null;
  } | null;
}

/**
 * Get organization by ID with linked projects, meetings, and latest
 * AI-generated summaries (context + briefing with optional timeline).
 *
 * De briefing-summary heeft `structured_content.timeline` als die bestaat —
 * dat is de gemixte meeting+email timeline (zie generateOrgSummaries).
 */
export async function getOrganizationById(
  orgId: string,
  client?: SupabaseClient,
): Promise<OrganizationDetail | null> {
  const db = client ?? getAdminClient();

  const { data: org, error } = await db
    .from("organizations")
    .select("id, name, type, status, contact_person, email, email_domains")
    .eq("id", orgId)
    .single();

  if (error || !org) return null;

  const [{ data: projects }, { data: meetings }, contextSummary, briefingSummary] =
    await Promise.all([
      db.from("projects").select("id, name, status").eq("organization_id", orgId).order("name"),
      db
        .from("meetings")
        .select("id, title, date, meeting_type, verification_status")
        .eq("organization_id", orgId)
        .order("date", { ascending: false })
        .limit(20),
      getLatestSummary("organization", orgId, "context", db),
      getLatestSummary("organization", orgId, "briefing", db),
    ]);

  return {
    ...org,
    email_domains: (org.email_domains ?? []) as string[],
    projects: projects ?? [],
    meetings: meetings ?? [],
    context_summary: contextSummary
      ? {
          content: contextSummary.content,
          version: contextSummary.version,
          created_at: contextSummary.created_at,
        }
      : null,
    briefing_summary: briefingSummary
      ? {
          content: briefingSummary.content,
          version: briefingSummary.version,
          created_at: briefingSummary.created_at,
          structured_content: briefingSummary.structured_content,
        }
      : null,
  };
}

export async function getAllOrganizations() {
  const { data, error } = await getAdminClient().from("organizations").select("id, name, aliases");

  if (error || !data) return [];
  return data;
}

/**
 * List organizations filtered by one or more relationship types.
 *
 * Geldige types: 'client' | 'partner' | 'supplier' | 'advisor' | 'internal' | 'other'.
 *
 * Gedrag bij lege `types`-array: retourneert een leeg array (early return).
 * Dit is een bewuste keuze — een lege filter zonder types mag nooit de
 * volledige lijst teruggeven (zou onveilig zijn bij toekomstige autorisatie).
 *
 * Hergebruikt dezelfde project-count + last-meeting-date berekening als
 * listOrganizations, zodat de UI dezelfde OrganizationListItem shape krijgt.
 *
 * @example
 *   listOrganizationsByType(['advisor'])           // alleen adviseurs
 *   listOrganizationsByType(['advisor', 'internal']) // adviseurs + eigen bedrijf
 */
/**
 * Zoek de organization.id die het opgegeven e-maildomein in zijn
 * `email_domains` array heeft staan. Retourneert de eerste match of null.
 *
 * Gebruikt door de email-pipeline als derde fallback (na classifier-naam
 * en sender-person matches). Zie sprint 034 / FUNC-036.
 *
 * Input wordt naar lowercase genormaliseerd; DB-waardes zijn altijd lowercase
 * (zie `normalizeEmailDomains` in mutations/organizations.ts).
 */
export async function findOrganizationIdByEmailDomain(
  domain: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const cleaned = domain.trim().toLowerCase();
  if (!cleaned) return null;

  const db = client ?? getAdminClient();
  // Geen .maybeSingle() — die throwt als twee organisaties per ongeluk
  // hetzelfde domein claimen. Onder PostgREST wordt .limit(1) genegeerd in
  // combinatie met .maybeSingle(). We pakken de eerste rij defensief.
  const { data, error } = await db
    .from("organizations")
    .select("id")
    .contains("email_domains", [cleaned])
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0].id;
}

export async function listOrganizationsByType(
  types: string[],
  client?: SupabaseClient,
  options?: { limit?: number },
): Promise<OrganizationListItem[]> {
  if (types.length === 0) return [];

  const db = client ?? getAdminClient();

  const { data: orgs, error } = await db
    .from("organizations")
    .select("id, name, type, status, contact_person, email")
    .in("type", types)
    .order("name")
    .limit(options?.limit ?? 500);

  if (error || !orgs || orgs.length === 0) return [];

  const orgIds = orgs.map((o) => o.id);

  // Batch: project count per org
  const { data: projects } = await db
    .from("projects")
    .select("organization_id")
    .in("organization_id", orgIds);

  const projectCountMap = new Map<string, number>();
  if (projects) {
    for (const p of projects) {
      if (!p.organization_id) continue;
      projectCountMap.set(p.organization_id, (projectCountMap.get(p.organization_id) ?? 0) + 1);
    }
  }

  // Batch: last meeting date per org
  const { data: meetings } = await db
    .from("meetings")
    .select("organization_id, date")
    .in("organization_id", orgIds)
    .order("date", { ascending: false });

  const lastMeetingMap = new Map<string, string>();
  if (meetings) {
    for (const m of meetings) {
      if (!m.organization_id || !m.date) continue;
      if (!lastMeetingMap.has(m.organization_id)) {
        lastMeetingMap.set(m.organization_id, m.date);
      }
    }
  }

  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    type: o.type,
    status: o.status,
    contact_person: o.contact_person,
    email: o.email,
    project_count: projectCountMap.get(o.id) ?? 0,
    last_meeting_date: lastMeetingMap.get(o.id) ?? null,
  }));
}
