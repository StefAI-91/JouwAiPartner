import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface PersonListItem {
  id: string;
  name: string;
  email: string | null;
  team: string | null;
  role: string | null;
}

/**
 * List people ordered by name, with optional limit for scalability.
 */
export async function listPeople(
  client?: SupabaseClient,
  options?: { limit?: number },
): Promise<PersonListItem[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("people")
    .select("id, name, email, team, role")
    .order("name")
    .limit(options?.limit ?? 500);

  if (error || !data) return [];
  return data;
}

export interface PersonWithOrg {
  id: string;
  name: string;
  role: string | null;
  organization: { name: string } | null;
}

/**
 * List people with organization name, for selector dropdowns.
 */
export async function listPeopleWithOrg(
  client?: SupabaseClient,
  options?: { limit?: number },
): Promise<PersonWithOrg[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("people")
    .select("id, name, role, organization:organizations(name)")
    .order("name")
    .limit(options?.limit ?? 500);

  if (error || !data) return [];
  return data as unknown as PersonWithOrg[];
}

export interface PersonForAssignment {
  id: string;
  name: string;
  team: string | null;
  organization_name: string | null;
}

/**
 * List all people with team and organization name (for task assignment dropdowns).
 */
export async function listPeopleForAssignment(
  client?: SupabaseClient,
): Promise<PersonForAssignment[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("people")
    .select("id, name, team, organizations(name)")
    .order("name");

  if (error || !data) return [];
  return data.map((p) => {
    const org = p.organizations as unknown as { name: string } | null;
    return {
      id: p.id,
      name: p.name,
      team: p.team,
      organization_name: org?.name ?? null,
    };
  });
}

/**
 * Find person IDs by partial name match (ILIKE).
 * Used by MCP tools to resolve person name filters.
 */
export async function findPersonIdsByName(name: string): Promise<string[]> {
  const escaped = name.replace(/%/g, "\\%").replace(/_/g, "\\_");
  const { data } = await getAdminClient().from("people").select("id").ilike("name", `%${escaped}%`);

  return data?.map((p) => p.id) ?? [];
}

/**
 * Find a profile ID by partial name match.
 * Used by MCP tools to resolve corrected_by names to user IDs.
 */
export async function findProfileIdByName(name: string): Promise<string | null> {
  const escaped = name.replace(/%/g, "\\%").replace(/_/g, "\\_");
  const { data } = await getAdminClient()
    .from("profiles")
    .select("id")
    .ilike("full_name", `%${escaped}%`)
    .limit(1);

  return data?.[0]?.id ?? null;
}

export interface PersonDetail {
  id: string;
  name: string;
  email: string | null;
  team: string | null;
  role: string | null;
  organization_id: string | null;
  organization: { name: string } | null;
  meeting_count: number;
}

export async function getPersonById(
  personId: string,
  client?: SupabaseClient,
): Promise<PersonDetail | null> {
  const db = client ?? getAdminClient();

  const { data: person, error } = await db
    .from("people")
    .select("id, name, email, team, role, organization_id, organization:organizations(name)")
    .eq("id", personId)
    .single();

  if (error || !person) return null;

  const { count } = await db
    .from("meeting_participants")
    .select("meeting_id", { count: "exact", head: true })
    .eq("person_id", personId);

  return {
    ...(person as unknown as Omit<PersonDetail, "meeting_count">),
    meeting_count: count ?? 0,
  };
}

export async function getStalePeople(limit: number = 50) {
  const { data, error } = await getAdminClient()
    .from("people")
    .select("id, name, team, role")
    .eq("embedding_stale", true)
    .limit(limit);
  if (error || !data) return [];
  return data;
}

export interface KnownPerson {
  id: string;
  name: string;
  email: string | null;
  team: string | null;
  role: string | null;
  organization_id: string | null;
  organization_name: string | null;
  organization_type: string | null;
}

/**
 * Get all known people with their organization name and type.
 * Used by the Gatekeeper pipeline to classify participants as internal/external.
 * Internal = has a team. External = no team but has organization_id.
 */
export async function getAllKnownPeople(): Promise<KnownPerson[]> {
  const { data, error } = await getAdminClient()
    .from("people")
    .select("id, name, email, team, role, organization_id, organizations(name, type)");

  if (error || !data) return [];
  return data.map((p) => {
    const org = p.organizations as unknown as { name: string; type: string } | null;
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      team: p.team,
      role: p.role ?? null,
      organization_id: p.organization_id,
      organization_name: org?.name ?? null,
      organization_type: org?.type ?? null,
    };
  });
}

/**
 * Find people by their email addresses.
 * Returns a map of email -> person_id for matched emails.
 */
export interface PersonForContext {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  organization_name: string | null;
}

/**
 * Get all people with their organization name, role, and email.
 * Used by Gatekeeper/Classifier context-injection for entity context
 * and party_type identification (e.g. accountant, tax_advisor).
 */
export async function getPeopleForContext(): Promise<PersonForContext[]> {
  const { data, error } = await getAdminClient()
    .from("people")
    .select("id, name, email, role, organization:organizations(name)");

  if (error || !data) return [];
  return data.map((p) => {
    const org = p.organization as unknown as { name: string } | null;
    return {
      id: p.id,
      name: p.name,
      email: p.email ?? null,
      role: p.role ?? null,
      organization_name: org?.name ?? null,
    };
  });
}

/**
 * Find people by their names (case-insensitive exact match).
 * Returns a map of lowercase name -> person_id for matched names.
 * Used by speaker-map to link transcript speakers to known people.
 */
export async function findPeopleByNames(names: string[]): Promise<Map<string, string>> {
  if (names.length === 0) return new Map();

  // Supabase in-filter is case-sensitive, so fetch all people and match in JS.
  // This reuses the same people list that participant-classifier already fetches.
  const { data, error } = await getAdminClient().from("people").select("id, name");

  if (error || !data) return new Map();

  const lowerNames = new Set(names.map((n) => n.toLowerCase()));
  const result = new Map<string, string>();
  for (const person of data) {
    const lower = person.name.toLowerCase();
    if (lowerNames.has(lower)) {
      result.set(lower, person.id);
    }
  }
  return result;
}

export async function findPeopleByEmails(emails: string[]): Promise<Map<string, string>> {
  if (emails.length === 0) return new Map();

  const { data, error } = await getAdminClient()
    .from("people")
    .select("id, email")
    .in("email", emails);

  if (error || !data) return new Map();

  const result = new Map<string, string>();
  for (const person of data) {
    if (person.email) {
      result.set(person.email.toLowerCase(), person.id);
    }
  }
  return result;
}
