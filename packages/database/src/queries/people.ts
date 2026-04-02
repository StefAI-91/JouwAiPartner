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
 * List all people ordered by name.
 */
export async function listPeople(client?: SupabaseClient): Promise<PersonListItem[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("people")
    .select("id, name, email, team, role")
    .order("name");

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
 * List all people with organization name, for selector dropdowns.
 */
export async function listPeopleWithOrg(client?: SupabaseClient): Promise<PersonWithOrg[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("people")
    .select("id, name, role, organization:organizations(name)")
    .order("name");

  if (error || !data) return [];
  return data as unknown as PersonWithOrg[];
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
    .select("id, name, email, team, organization_id, organizations(name, type)");

  if (error || !data) return [];
  return data.map((p) => {
    const org = p.organizations as unknown as { name: string; type: string } | null;
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      team: p.team,
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
