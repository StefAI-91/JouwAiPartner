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
