import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

/**
 * Voeg een domein toe aan de widget-whitelist voor een project. Caller is
 * verantwoordelijk voor `isAdmin`-check + Zod-validatie van het domein.
 *
 * Idempotent: bij dubbel toevoegen geeft Postgres een 23505 (PK conflict);
 * we vangen 'm op en geven `success: true` zodat de UI niet rood wordt op
 * een no-op. Andere errors worden wel teruggegeven.
 */
export async function addWidgetDomain(
  projectId: string,
  domain: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("widget_allowed_projects")
    .insert({ project_id: projectId, domain });

  if (error) {
    if (error.code === "23505") return { success: true };
    console.error("[addWidgetDomain]", error.message);
    return { error: error.message };
  }
  return { success: true };
}

/**
 * Verwijder een domein. Idempotent — niet-bestaande rij = 0 deletes, geen
 * error.
 */
export async function removeWidgetDomain(
  projectId: string,
  domain: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("widget_allowed_projects")
    .delete()
    .eq("project_id", projectId)
    .eq("domain", domain);

  if (error) {
    console.error("[removeWidgetDomain]", error.message);
    return { error: error.message };
  }
  return { success: true };
}
