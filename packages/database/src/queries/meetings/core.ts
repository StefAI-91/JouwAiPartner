import { getAdminClient } from "../../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Core list/get queries voor verified meetings + de board-meeting projectie.
 * Specifiekere flows wonen in sub-files:
 *   - lookup.ts            fireflies/title-date lookups
 *   - pipeline-fetches.ts  reclassify/dev-extractor/embedding/segmentation
 *   - regenerate.ts        regenerate/reprocess/backfill
 *   - metadata.ts          organization/project/participant ids
 *   - speaker-mapping.ts   speaker-mapping backfill + pipeline-stap
 *   - project-summaries.ts segmenten per meeting + per project
 *   - themes.ts            meeting_themes junction
 */

export interface MeetingDetail {
  id: string;
  title: string | null;
  original_title: string | null;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  transcript: string | null;
  transcript_elevenlabs: string | null;
  transcript_elevenlabs_named: string | null;
  summary: string | null;
  raw_fireflies: Record<string, unknown> | null;
  organization_id: string | null;
  verification_status: string;
  verified_at: string | null;
  verifier: { full_name: string | null } | null;
  organization: { name: string } | null;
  meeting_participants: { person: { id: string; name: string } }[];
  meeting_projects: { project: { id: string; name: string } }[];
  extractions: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    transcript_ref: string | null;
    metadata: Record<string, unknown>;
    reasoning: string | null;
  }[];
}

export async function getVerifiedMeetingById(
  meetingId: string,
  client?: SupabaseClient,
): Promise<MeetingDetail | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select(
      `id, title, original_title, date, meeting_type, party_type, transcript, transcript_elevenlabs, transcript_elevenlabs_named, summary, raw_fireflies,
       organization_id, verification_status, verified_at,
       verifier:profiles!meetings_verified_by_fkey(full_name),
       organization:organizations(name),
       meeting_participants(person:people(id, name)),
       meeting_projects(project:projects(id, name)),
       extractions(id, type, content, confidence, transcript_ref, metadata, reasoning)`,
    )
    .eq("id", meetingId)
    .eq("verification_status", "verified")
    .single();

  if (error) {
    console.error("[getVerifiedMeetingById]", error.message);
    return null;
  }
  return data as unknown as MeetingDetail;
}

export interface RecentMeeting {
  id: string;
  title: string | null;
  date: string | null;
  participants: string[] | null;
  relevance_score: number | null;
  meeting_type: string | null;
  verification_status: string | null;
}

export interface VerifiedMeetingListItem {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  organization: { name: string } | null;
  participants: { id: string; name: string }[];
}

export async function listVerifiedMeetings(
  client?: SupabaseClient,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<{ data: VerifiedMeetingListItem[]; total: number }> {
  const db = client ?? getAdminClient();
  const { data, error, count } = await db
    .from("meetings")
    .select(
      `id, title, date, meeting_type,
       organization:organizations(name),
       meeting_participants(person:people(id, name))`,
      { count: "exact" },
    )
    .eq("verification_status", "verified")
    .order("date", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[listVerifiedMeetings] Database error:", error.message);
    return { data: [], total: 0 };
  }

  const meetings = (
    data as unknown as (Omit<VerifiedMeetingListItem, "participants"> & {
      meeting_participants: { person: { id: string; name: string } }[];
    })[]
  ).map(({ meeting_participants, ...rest }) => ({
    ...rest,
    participants: meeting_participants?.map((mp) => mp.person) ?? [],
  }));

  return { data: meetings, total: count ?? meetings.length };
}

/**
 * TH-009 — minimale projectie van verified meetings (id/title/summary) ordered
 * by date desc, met optionele limit. Gebruikt door
 * `scripts/batch-detect-themes.ts` (TH-011) om de Theme-Detector + link-themes
 * over bestaande meetings te draaien zonder directe `.from()`-call buiten
 * de queries-laag.
 */
export interface VerifiedMeetingIdRow {
  id: string;
  title: string | null;
  summary: string | null;
}

export async function listVerifiedMeetingIdsOrderedByDate(
  options?: { limit?: number },
  client?: SupabaseClient,
): Promise<VerifiedMeetingIdRow[]> {
  const db = client ?? getAdminClient();
  const query = db
    .from("meetings")
    .select("id, title, summary")
    .eq("verification_status", "verified")
    .order("date", { ascending: false });
  if (options?.limit) query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw new Error(`listVerifiedMeetingIdsOrderedByDate failed: ${error.message}`);
  return data ?? [];
}

export interface BoardMeetingListItem {
  id: string;
  title: string | null;
  date: string | null;
  summary: string | null;
  participants: { id: string; name: string }[];
  decision_count: number;
  action_item_count: number;
}

interface BoardMeetingRow {
  id: string;
  title: string | null;
  date: string | null;
  summary: string | null;
  meeting_participants: { person: { id: string; name: string } | null }[];
  extractions: { type: string }[];
}

/**
 * Lijst van bestuurlijke (board) meetings, sprint 035.
 * Alleen verified, gesorteerd op datum desc, gepagineerd.
 */
export async function listBoardMeetings(
  client?: SupabaseClient,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<{ data: BoardMeetingListItem[]; total: number }> {
  const db = client ?? getAdminClient();
  const { data, error, count } = await db
    .from("meetings")
    .select(
      `id, title, date, summary,
       meeting_participants(person:people(id, name)),
       extractions(type)`,
      { count: "exact" },
    )
    .eq("meeting_type", "board")
    .eq("verification_status", "verified")
    .order("date", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[listBoardMeetings] Database error:", error.message);
    return { data: [], total: 0 };
  }

  const rows = (data ?? []) as unknown as BoardMeetingRow[];
  const meetings: BoardMeetingListItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    summary: row.summary,
    participants: (row.meeting_participants ?? [])
      .map((mp) => mp.person)
      .filter((p): p is { id: string; name: string } => p !== null),
    decision_count: (row.extractions ?? []).filter((e) => e.type === "decision").length,
    action_item_count: (row.extractions ?? []).filter((e) => e.type === "action_item").length,
  }));

  return { data: meetings, total: count ?? meetings.length };
}
