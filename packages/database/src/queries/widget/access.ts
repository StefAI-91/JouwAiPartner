import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

/**
 * Lijst alle whitelisted domeinen voor een project.
 *
 * Gebruikt door `/api/ingest/widget` om Origin-headers te valideren. Default
 * client = admin (service-role) want de route draait stateless en hoeft niet
 * via een gebruiker-session te lopen.
 */
export async function getAllowedDomainsForProject(
  projectId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("widget_allowed_projects")
    .select("domain")
    .eq("project_id", projectId);

  if (error) {
    console.error("[getAllowedDomainsForProject]", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.domain as string);
}

/**
 * Resolve `Origin` (full URL) → host en check of die op de whitelist
 * staat voor het opgegeven project. Geeft `false` bij ongeldige Origin
 * zodat de route fail-closed afhandelt.
 */
export async function isOriginAllowedForProject(
  projectId: string,
  origin: string,
  client?: SupabaseClient,
): Promise<boolean> {
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  const domains = await getAllowedDomainsForProject(projectId, client);
  return domains.includes(host);
}
