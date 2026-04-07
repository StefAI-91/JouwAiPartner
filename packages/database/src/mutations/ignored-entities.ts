import { getAdminClient } from "../supabase/admin";

/**
 * Add a name to the ignored_entities list.
 * Uses upsert with ON CONFLICT DO NOTHING to be idempotent.
 */
export async function addIgnoredEntity(
  organizationId: string,
  entityName: string,
  entityType: "project" | "organization" | "person",
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().from("ignored_entities").upsert(
    {
      organization_id: organizationId,
      entity_name: entityName,
      entity_type: entityType,
    },
    { onConflict: "organization_id,entity_name,entity_type", ignoreDuplicates: true },
  );

  if (error) return { error: error.message };
  return { success: true };
}
