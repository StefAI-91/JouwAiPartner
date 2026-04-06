import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface MeetingSegment {
  id: string;
  meeting_id: string;
  project_id: string | null;
  project_name_raw: string | null;
  is_general: boolean;
  kernpunten: string[];
  vervolgstappen: string[];
  project_name: string | null;
}

/**
 * Get all segments for a meeting, with project name via JOIN.
 * Ordered: named projects first (alphabetical), then Algemeen.
 */
export async function getSegmentsByMeetingId(
  meetingId: string,
  client?: SupabaseClient,
): Promise<MeetingSegment[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("meeting_project_summaries")
    .select(
      `id, meeting_id, project_id, project_name_raw, is_general, kernpunten, vervolgstappen,
       project:projects(name)`,
    )
    .eq("meeting_id", meetingId)
    .order("is_general", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const project = row.project as unknown as { name: string } | null;
    return {
      id: row.id,
      meeting_id: row.meeting_id,
      project_id: row.project_id,
      project_name_raw: row.project_name_raw,
      is_general: row.is_general,
      kernpunten: row.kernpunten ?? [],
      vervolgstappen: row.vervolgstappen ?? [],
      project_name: project?.name ?? null,
    };
  });
}
