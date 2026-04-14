import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

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
}

/**
 * Get organization by ID with linked projects and meetings.
 */
export async function getOrganizationById(
  orgId: string,
  client?: SupabaseClient,
): Promise<OrganizationDetail | null> {
  const db = client ?? getAdminClient();

  const { data: org, error } = await db
    .from("organizations")
    .select("id, name, type, status, contact_person, email")
    .eq("id", orgId)
    .single();

  if (error || !org) return null;

  const [{ data: projects }, { data: meetings }] = await Promise.all([
    db.from("projects").select("id, name, status").eq("organization_id", orgId).order("name"),
    db
      .from("meetings")
      .select("id, title, date, meeting_type, verification_status")
      .eq("organization_id", orgId)
      .order("date", { ascending: false })
      .limit(20),
  ]);

  return {
    ...org,
    projects: projects ?? [],
    meetings: meetings ?? [],
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
