import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

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

/**
 * List people die gekoppeld zijn aan een specifieke organisatie.
 * Gebruikt door de administratie-detailpagina om contactpersonen van een
 * adviseur te tonen. Zie sprint 034.
 */
export async function listPeopleByOrganization(
  orgId: string,
  client?: SupabaseClient,
): Promise<PersonListItem[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("people")
    .select("id, name, email, team, role")
    .eq("organization_id", orgId)
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
