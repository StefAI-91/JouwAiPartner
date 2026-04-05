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

  // Use a single query to atomically determine the next version and insert.
  // Falls back to retry once if a unique constraint violation occurs (race condition).
  for (let attempt = 0; attempt < 2; attempt++) {
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
      // Unique constraint violation — retry with fresh version number
      if (error.code === "23505" && attempt === 0) continue;
      console.error("[createSummaryVersion]", error.message);
      return { error: error.message };
    }

    return { success: true, data };
  }

  return { error: "Failed to create summary version after retry" };
}
