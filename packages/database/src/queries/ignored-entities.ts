import { getAdminClient } from "../supabase/admin";

/**
 * Get all ignored entity names for an organization and entity type.
 * Returns a Set of lowercased names for fast lookup.
 */
export async function getIgnoredEntityNames(
  organizationId: string,
  entityType: "project" | "organization" | "person",
): Promise<Set<string>> {
  const { data, error } = await getAdminClient()
    .from("ignored_entities")
    .select("entity_name")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType);

  if (error || !data) return new Set();
  return new Set(data.map((row) => row.entity_name.toLowerCase()));
}
