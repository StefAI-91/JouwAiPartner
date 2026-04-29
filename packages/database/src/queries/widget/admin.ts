import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

export interface WidgetProjectWithDomains {
  id: string;
  name: string;
  domains: string[];
}

/**
 * Lijst alle projecten met hun whitelisted widget-domains. Gebruikt door de
 * DevHub admin-pagina (`/settings/widget`). Voert één join uit zodat we niet
 * N+1 over projecten heen hoeven te lopen.
 *
 * Default = admin-client want de admin-UI draait in een server action met
 * `isAdmin`-check; een page-client met RLS werkt ook (de policy laat admins
 * alles zien) maar service-role spaart een auth-roundtrip.
 */
export async function listWidgetProjectsWithDomains(
  client?: SupabaseClient,
): Promise<WidgetProjectWithDomains[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("projects")
    .select("id, name, widget_allowed_projects(domain)")
    .order("name");

  if (error) {
    console.error("[listWidgetProjectsWithDomains]", error.message);
    return [];
  }

  type Row = {
    id: string;
    name: string;
    widget_allowed_projects: { domain: string }[] | null;
  };

  return ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    domains: (row.widget_allowed_projects ?? []).map((d) => d.domain).sort(),
  }));
}
