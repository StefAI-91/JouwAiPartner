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

/**
 * Batch fetch segments for multiple meetings (avoids N+1 in MCP tools).
 * Returns a Map of meetingId -> MeetingSegment[].
 */
export async function getSegmentsByMeetingIds(
  meetingIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, MeetingSegment[]>> {
  if (meetingIds.length === 0) return new Map();
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("meeting_project_summaries")
    .select(
      `id, meeting_id, project_id, project_name_raw, is_general, kernpunten, vervolgstappen,
       project:projects(name)`,
    )
    .in("meeting_id", meetingIds)
    .order("is_general", { ascending: true });

  if (error || !data) return new Map();

  const result = new Map<string, MeetingSegment[]>();
  for (const row of data) {
    const project = row.project as unknown as { name: string } | null;
    const segment: MeetingSegment = {
      id: row.id,
      meeting_id: row.meeting_id,
      project_id: row.project_id,
      project_name_raw: row.project_name_raw,
      is_general: row.is_general,
      kernpunten: row.kernpunten ?? [],
      vervolgstappen: row.vervolgstappen ?? [],
      project_name: project?.name ?? null,
    };
    const list = result.get(row.meeting_id) ?? [];
    list.push(segment);
    result.set(row.meeting_id, list);
  }
  return result;
}

/**
 * Get segment counts per meeting (for list_meetings MCP tool).
 * Selects only the grouping column with a safeguard limit.
 */
export async function getSegmentCountsByMeetingIds(
  meetingIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, number>> {
  if (meetingIds.length === 0) return new Map();
  const db = client ?? getAdminClient();

  // Supabase JS doesn't support GROUP BY; fetch IDs and count in JS.
  // Limit to 5000 rows as safeguard — at ~5 segments/meeting this covers 1000 meetings.
  const { data } = await db
    .from("meeting_project_summaries")
    .select("meeting_id")
    .in("meeting_id", meetingIds)
    .limit(5000);

  const counts = new Map<string, number>();
  if (data) {
    for (const row of data) {
      counts.set(row.meeting_id, (counts.get(row.meeting_id) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Get segment count per project (for get_projects MCP tool).
 * Selects only the grouping column with a safeguard limit.
 */
export async function getSegmentCountsByProjectIds(
  projectIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, number>> {
  if (projectIds.length === 0) return new Map();
  const db = client ?? getAdminClient();

  const { data } = await db
    .from("meeting_project_summaries")
    .select("project_id")
    .in("project_id", projectIds)
    .limit(5000);

  const counts = new Map<string, number>();
  if (data) {
    for (const row of data) {
      if (row.project_id) {
        counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export interface ProjectSegment {
  id: string;
  meeting_id: string;
  meeting_title: string | null;
  meeting_date: string | null;
  kernpunten: string[];
  vervolgstappen: string[];
}

/**
 * Get all segments for a specific project, with meeting info.
 * Used on the project detail page to show only project-relevant content.
 */
export async function getSegmentsByProjectId(
  projectId: string,
  client?: SupabaseClient,
): Promise<ProjectSegment[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("meeting_project_summaries")
    .select(
      `id, meeting_id, kernpunten, vervolgstappen,
       meeting:meetings(title, date)`,
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const meeting = row.meeting as unknown as { title: string | null; date: string | null } | null;
    return {
      id: row.id,
      meeting_id: row.meeting_id,
      meeting_title: meeting?.title ?? null,
      meeting_date: meeting?.date ?? null,
      kernpunten: row.kernpunten ?? [],
      vervolgstappen: row.vervolgstappen ?? [],
    };
  });
}
