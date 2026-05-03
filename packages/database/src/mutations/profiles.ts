import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import {
  dismissOnboardingInputSchema,
  profilePreferencesSchema,
  type OnboardingKey,
  type ProfilePreferences,
} from "../validations/profiles";

/**
 * Self-heal missing profile row voor een auth.users entry. De handle_new_user
 * trigger hoort dit te doen, maar legacy- of trigger-missed users kunnen een
 * profile-rij missen. `profiles` heeft geen INSERT policy voor authenticated
 * users, dus deze helper draait altijd via de admin client.
 *
 * Idempotent: `onConflict: "id", ignoreDuplicates: true` — re-runs hebben
 * geen effect als de rij er al staat.
 */
export async function upsertProfile(
  input: { id: string; email: string },
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("profiles")
    .upsert(
      { id: input.id, email: input.email.toLowerCase() },
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Zet `profiles.organization_id` voor één profile. Dunne wrapper rond een
 * UPDATE — bestaat zodat de invite-flow geen directe `.from()` op `profiles`
 * hoeft te doen en het org-update-pad één plek heeft die we kunnen
 * unit-testen zonder de hele invite-action mee te draaien.
 *
 * Geen role-check hier; de caller (admin-action) verifieert reeds dat de
 * target een klant is en dat een org-sync gewenst is. Mismatching org wordt
 * óók in de caller afgehandeld (single-tenant-guard) zodat we hier niet
 * stilletjes overschrijven.
 */
export async function setProfileOrganization(
  profileId: string,
  organizationId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ organization_id: organizationId })
    .eq("id", profileId);
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * CC-005 — markeer een onboarding-card als dismissed voor deze user. Atomic
 * via de `dismiss_onboarding_key` RPC zodat parallelle dismissals (bv. portal-
 * en cockpit-tab tegelijk) elkaars `preferences`-keys niet overschrijven. De
 * `key` wordt door Zod gevalideerd (alleen bekende keys) — een vrije string
 * komt nooit als jsonb-pad in de RPC terecht.
 */
export async function dismissOnboarding(
  profileId: string,
  key: OnboardingKey,
  client?: SupabaseClient,
): Promise<{ success: true; preferences: ProfilePreferences } | { error: string }> {
  const validated = dismissOnboardingInputSchema.safeParse({ key });
  if (!validated.success) return { error: "Onbekende onboarding-key" };

  const db = client ?? getAdminClient();
  const { data, error } = await db.rpc("dismiss_onboarding_key", {
    p_profile_id: profileId,
    p_key: validated.data.key,
    p_timestamp: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  const parsed = profilePreferencesSchema.safeParse(data ?? {});
  return { success: true, preferences: parsed.success ? parsed.data : {} };
}
