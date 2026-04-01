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

export async function getStalePeople(limit: number = 50) {
  const { data, error } = await getAdminClient()
    .from("people")
    .select("id, name, team, role")
    .eq("embedding_stale", true)
    .limit(limit);
  if (error || !data) return [];
  return data;
}

export interface InternalPerson {
  id: string;
  name: string;
  email: string | null;
}

/**
 * Get all internal team members (people with a team assigned).
 * Used by the Gatekeeper pipeline to classify participants as internal/external.
 */
export async function getInternalPeople(): Promise<InternalPerson[]> {
  const { data, error } = await getAdminClient()
    .from("people")
    .select("id, name, email")
    .not("team", "is", null);

  if (error || !data) return [];
  return data;
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
