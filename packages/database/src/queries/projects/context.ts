import { getAdminClient } from "../../supabase/admin";

export interface ActiveProjectForContext {
  id: string;
  name: string;
  aliases: string[];
  organization_name: string | null;
}

/**
 * Get active projects (not completed/lost) with organization name.
 * Used by Gatekeeper context-injection for project identification.
 */
export async function getActiveProjectsForContext(): Promise<ActiveProjectForContext[]> {
  const { data, error } = await getAdminClient()
    .from("projects")
    .select("id, name, aliases, organization:organizations(name)")
    .not("status", "in", '("completed","lost")');

  if (error || !data) return [];
  return data.map((p) => {
    const org = p.organization as unknown as { name: string } | null;
    return {
      id: p.id,
      name: p.name,
      aliases: p.aliases ?? [],
      organization_name: org?.name ?? null,
    };
  });
}
