import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export async function createSummaryVersion(
  entityType: "project" | "organization",
  entityId: string,
  summaryType: "context" | "briefing",
  content: string,
  sourceMeetingIds: string[] = [],
  client?: SupabaseClient,
): Promise<{ success: true; data: { id: string; version: number } } | { error: string }> {
  const db = client ?? getAdminClient();

  // Get current max version for this entity+type combo
  const { data: existing } = await db
    .from("summaries")
    .select("version")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("summary_type", summaryType)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = existing ? existing.version + 1 : 1;

  const { data, error } = await db
    .from("summaries")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      summary_type: summaryType,
      content,
      version: nextVersion,
      source_meeting_ids: sourceMeetingIds,
    })
    .select("id, version")
    .single();

  if (error) {
    console.error("[createSummaryVersion]", error.message);
    return { error: error.message };
  }

  return { success: true, data };
}
