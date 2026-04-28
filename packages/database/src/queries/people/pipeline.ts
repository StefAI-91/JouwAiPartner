import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

export interface KnownPerson {
  id: string;
  name: string;
  email: string | null;
  team: string | null;
  role: string | null;
  organization_id: string | null;
  organization_name: string | null;
  organization_type: string | null;
  is_admin: boolean;
}

/**
 * Get all known people with their organization name and type.
 * Used by the Gatekeeper pipeline to classify participants as internal/external.
 * Internal = has a team. External = no team but has organization_id.
 *
 * `is_admin` is filled via case-insensitive match between `people.email` and
 * `profiles.email` waar `profiles.role = 'admin'`. Sprint 035 — board-meetings.
 */
export async function getAllKnownPeople(): Promise<KnownPerson[]> {
  const db = getAdminClient();

  const [peopleResult, adminEmails] = await Promise.all([
    db
      .from("people")
      .select("id, name, email, team, role, organization_id, organizations(name, type)"),
    getAdminEmails(),
  ]);

  if (peopleResult.error || !peopleResult.data) return [];

  return peopleResult.data.map((p) => {
    const org = p.organizations as unknown as { name: string; type: string } | null;
    const personEmail = p.email?.trim().toLowerCase() || null;
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      team: p.team,
      role: p.role ?? null,
      organization_id: p.organization_id,
      organization_name: org?.name ?? null,
      organization_type: org?.type ?? null,
      is_admin: personEmail ? adminEmails.has(personEmail) : false,
    };
  });
}

/**
 * Returns the (trimmed, lowercase) e-mailadressen van alle profiles met
 * role = 'admin'. Sprint 035 — gebruikt door `getAllKnownPeople` om `is_admin`
 * te vullen. Logt expliciet wanneer de query faalt zodat board-detectie niet
 * stil terugvalt op "geen admins".
 */
export async function getAdminEmails(client?: SupabaseClient): Promise<Set<string>> {
  const db = client ?? getAdminClient();
  const { data, error } = await db.from("profiles").select("email").eq("role", "admin");

  if (error) {
    console.error("[getAdminEmails] Database error:", error.message);
    return new Set();
  }
  if (!data) return new Set();

  return new Set(
    data
      .map((row) => (row.email ? row.email.trim().toLowerCase() : null))
      .filter((e): e is string => !!e),
  );
}

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
