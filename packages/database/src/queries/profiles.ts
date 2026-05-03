import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import { profilePreferencesSchema, type ProfilePreferences } from "../validations/profiles";

/**
 * Lees `profiles.preferences` als gevalideerde `ProfilePreferences`. Bij
 * DB-error of corrupte JSON valt de helper terug op `{}` — onboarding-cards
 * tonen dan = acceptabele degradatie. Een gefaalde preferences-lookup mag de
 * pagina nooit kapot maken (CC-005 risico-tabel).
 */
export async function getProfilePreferences(
  profileId: string,
  client?: SupabaseClient,
): Promise<ProfilePreferences> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("preferences")
    .eq("id", profileId)
    .maybeSingle();

  if (error || !data) return {};

  const parsed = profilePreferencesSchema.safeParse(data.preferences ?? {});
  return parsed.success ? parsed.data : {};
}

/**
 * Lees alleen `profiles.organization_id` voor één profile. Gebruikt door de
 * invite-flow om te checken of een bestaande klant al gekoppeld is aan een
 * organisatie voordat we een nieuwe org-koppeling forceren — zo blokkeren we
 * stille cross-org overwrites die de RLS-multi-tenant-guard zouden omzeilen.
 *
 * Returnt `null` bij ontbrekende rij óf bij `organization_id IS NULL`; de
 * caller behandelt beide hetzelfde (sync nodig).
 */
export async function getProfileOrganizationId(
  profileId: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("organization_id")
    .eq("id", profileId)
    .maybeSingle();
  if (error) {
    console.error("[getProfileOrganizationId]", error.message);
    return null;
  }
  return ((data?.organization_id as string | null | undefined) ?? null) || null;
}
