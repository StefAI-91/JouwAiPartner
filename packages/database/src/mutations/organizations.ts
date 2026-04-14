import { getAdminClient } from "../supabase/admin";

export async function createOrganization(data: {
  name: string;
  type?: string;
  email?: string | null;
  email_domains?: string[];
}): Promise<{ success: true; data: { id: string; name: string } } | { error: string }> {
  const { data: org, error } = await getAdminClient()
    .from("organizations")
    .insert({
      name: data.name,
      type: data.type ?? "client",
      status: "active",
      email: data.email ?? null,
      email_domains: normalizeEmailDomains(data.email_domains),
    })
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `Er bestaat al een organisatie met de naam "${data.name}"` };
    }
    return { error: error.message };
  }
  return { success: true, data: org };
}

export async function updateOrganization(
  orgId: string,
  data: {
    name?: string;
    type?: string;
    status?: string;
    contact_person?: string | null;
    email?: string | null;
    email_domains?: string[];
  },
): Promise<{ success: true } | { error: string }> {
  const normalized = {
    ...data,
    ...(data.email_domains !== undefined
      ? { email_domains: normalizeEmailDomains(data.email_domains) }
      : {}),
  };
  const { error } = await getAdminClient()
    .from("organizations")
    .update({ ...normalized, updated_at: new Date().toISOString() })
    .eq("id", orgId);

  if (error) {
    if (error.code === "23505") {
      return { error: `Er bestaat al een organisatie met deze naam` };
    }
    return { error: error.message };
  }
  return { success: true };
}

/**
 * Normaliseer e-maildomeinen: lowercase, trim, dedupe, lege waardes eruit.
 * Retourneert altijd een array (leeg als input undefined/null/leeg).
 */
function normalizeEmailDomains(domains: string[] | undefined): string[] {
  if (!domains || domains.length === 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of domains) {
    const cleaned = raw.trim().toLowerCase();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }
  return result;
}

export async function deleteOrganization(
  orgId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().from("organizations").delete().eq("id", orgId);

  if (error) return { error: error.message };
  return { success: true };
}
