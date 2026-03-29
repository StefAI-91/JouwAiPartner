import { getAdminClient } from "@/lib/supabase/admin";

export async function getStalePeople(limit: number = 50) {
  const { data, error } = await getAdminClient()
    .from("people")
    .select("id, name, team, role")
    .eq("embedding_stale", true)
    .limit(limit);
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
