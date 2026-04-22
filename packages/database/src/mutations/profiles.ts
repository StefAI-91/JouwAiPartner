import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

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
