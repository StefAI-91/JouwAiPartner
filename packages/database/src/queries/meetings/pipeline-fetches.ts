import { getAdminClient } from "../../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Pipeline-fetches: queries die meetings ophalen voor de AI-pipeline-stappen
 * (reclassify, dev-extractor, embedding, segmentation, title-generation) en de
 * extractions-helpers die daarbij horen. Apart van regenerate.ts (waarvoor
 * `transcript_elevenlabs_named` en raw-fireflies belangrijker zijn) en
 * speaker-mapping.ts (eigen sub-domein).
 */

export interface MeetingForReclassify {
  id: string;
  title: string;
  date: string | null;
  participants: string[];
  summary: string | null;
  meeting_type: string | null;
  party_type: string | null;
  relevance_score: number | null;
  raw_fireflies: Record<string, unknown> | null;
}

/**
 * List meetings for reclassification, ordered by date descending.
 */
export async function listMeetingsForReclassify(
  limit: number = 50,
): Promise<MeetingForReclassify[]> {
  const { data, error } = await getAdminClient()
    .from("meetings")
    .select(
      "id, title, date, participants, summary, meeting_type, party_type, relevance_score, raw_fireflies",
    )
    .order("date", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as MeetingForReclassify[];
}

export interface DevExtractorMeetingOption {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
}

/**
 * Lijst meetings die een transcript hebben (transcript of transcript_elevenlabs).
 * Puur voor de /dev/extractor harness — selecteert alleen wat de dropdown
 * nodig heeft, géén transcript-kolommen (die halen we per-meeting op in de
 * action zodra Stef er één aanklikt). Filter gebeurt op de DB via `.or(...)`.
 */
export async function listMeetingsWithTranscript(
  limit: number = 40,
  client?: SupabaseClient,
): Promise<DevExtractorMeetingOption[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select("id, title, date, meeting_type")
    .or("transcript.not.is.null,transcript_elevenlabs.not.is.null")
    .order("date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("[listMeetingsWithTranscript]", error.message);
    return [];
  }
  return (data ?? []) as DevExtractorMeetingOption[];
}

export interface MeetingForDevExtractor {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  transcript: string | null;
  transcript_elevenlabs: string | null;
  participants: string[] | null;
}

/**
 * Haal één meeting op inclusief transcript-varianten voor de /dev/extractor
 * harness. Apart van getVerifiedMeetingById omdat deze ook draft meetings
 * toestaat en geen extractions-join doet (extractions komen via
 * getExtractionsForMeetingByType).
 */
export async function getMeetingForDevExtractor(
  meetingId: string,
  client?: SupabaseClient,
): Promise<MeetingForDevExtractor | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select(
      "id, title, date, meeting_type, party_type, transcript, transcript_elevenlabs, participants",
    )
    .eq("id", meetingId)
    .single();

  if (error || !data) return null;
  return data as MeetingForDevExtractor;
}

export async function getMeetingForEmbedding(
  meetingId: string,
): Promise<{ title: string | null; participants: string[] | null; summary: string | null } | null> {
  const { data, error } = await getAdminClient()
    .from("meetings")
    .select("title, participants, summary")
    .eq("id", meetingId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getExtractionIdsAndContent(
  meetingId: string,
): Promise<{ id: string; content: string }[]> {
  const { data, error } = await getAdminClient()
    .from("extractions")
    .select("id, content")
    .eq("meeting_id", meetingId);

  if (error || !data) return [];
  return data;
}

export async function getMeetingExtractions(meetingId: string) {
  const { data, error } = await getAdminClient()
    .from("extractions")
    .select("id, type, content, confidence, transcript_ref")
    .eq("meeting_id", meetingId);

  if (error || !data) return [];
  return data;
}

/**
 * Batch fetch extractions for multiple meetings at once (avoids N+1).
 * Returns a Map of meetingId -> extractions.
 */
export async function getMeetingExtractionsBatch(
  meetingIds: string[],
): Promise<Map<string, { type: string; content: string }[]>> {
  const result = new Map<string, { type: string; content: string }[]>();
  if (meetingIds.length === 0) return result;

  const { data, error } = await getAdminClient()
    .from("extractions")
    .select("meeting_id, type, content")
    .in("meeting_id", meetingIds);

  if (error || !data) return result;

  for (const row of data) {
    const existing = result.get(row.meeting_id) ?? [];
    existing.push({ type: row.type, content: row.content });
    result.set(row.meeting_id, existing);
  }

  return result;
}

export interface VerifiedMeetingForSummary {
  id: string;
  title: string | null;
  date: string | null;
  ai_briefing: string | null;
  summary: string | null;
  meeting_type: string | null;
}

/**
 * List verified meetings by id, ordered by date desc, with the fields the
 * project summary pipeline needs (title/date/ai_briefing/summary/meeting_type).
 * Filtert non-verified meetings uit de selectie.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function listVerifiedMeetingsForSummary(
  meetingIds: string[],
  client?: SupabaseClient,
): Promise<VerifiedMeetingForSummary[]> {
  if (meetingIds.length === 0) return [];
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select("id, title, date, ai_briefing, summary, meeting_type")
    .in("id", meetingIds)
    .eq("verification_status", "verified")
    .order("date", { ascending: false });

  if (error) {
    console.error("[listVerifiedMeetingsForSummary]", error.message);
    return [];
  }
  return (data ?? []) as VerifiedMeetingForSummary[];
}

export interface MeetingForBatchSegmentation {
  id: string;
  title: string;
  summary: string | null;
  transcript: string | null;
  date: string | null;
  organization_id: string | null;
}

/**
 * Get verified meetings that have no segments yet.
 * Used by the batch migration script (sprint 028).
 * Uses a database RPC with NOT EXISTS for efficient filtering.
 */
export async function getVerifiedMeetingsWithoutSegments(): Promise<MeetingForBatchSegmentation[]> {
  const db = getAdminClient();

  const { data, error } = await db.rpc("get_meetings_without_segments", {
    max_results: 500,
  });

  if (error || !data) return [];
  return data as MeetingForBatchSegmentation[];
}

export interface MeetingForTitleGeneration {
  id: string;
  title: string | null;
  summary: string | null;
  meeting_type: string | null;
  party_type: string | null;
  organization: { name: string } | null;
  meeting_projects: { project: { id: string; name: string } }[];
}

/**
 * Fetch meeting context needed for AI title generation.
 * Works for both draft and verified meetings (no verification_status filter).
 */
export async function getMeetingForTitleGeneration(
  meetingId: string,
): Promise<MeetingForTitleGeneration | null> {
  const { data, error } = await getAdminClient()
    .from("meetings")
    .select(
      `id, title, summary, meeting_type, party_type,
       organization:organizations(name),
       meeting_projects(project:projects(id, name))`,
    )
    .eq("id", meetingId)
    .single();

  if (error || !data) return null;
  return data as unknown as MeetingForTitleGeneration;
}
