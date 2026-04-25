import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

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

/**
 * Zoek person+organization op basis van één e-mailadres.
 *
 * Retourneert ook `organizationId` (uit `people.organization_id`) zodat de
 * email-pipeline kan bepalen bij welke organisatie een inkomende mail hoort
 * op basis van de afzender. Zie sprint 034 / FUNC-035.
 *
 * Case-insensitive: input wordt naar lowercase gezet en getoetst tegen
 * lowercase rijen (de DB bewaart emails in lowercase, dit is extra safeguard).
 */
export async function findPersonOrgByEmail(
  email: string,
  client?: SupabaseClient,
): Promise<{ personId: string; organizationId: string | null } | null> {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned) return null;

  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("people")
    .select("id, organization_id, email")
    .eq("email", cleaned)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    personId: data.id,
    organizationId: data.organization_id ?? null,
  };
}
