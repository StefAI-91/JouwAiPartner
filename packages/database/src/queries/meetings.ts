import { getAdminClient } from "../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MeetingDetail {
  id: string;
  title: string | null;
  original_title: string | null;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  transcript: string | null;
  transcript_elevenlabs: string | null;
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
      `id, title, original_title, date, meeting_type, party_type, transcript, transcript_elevenlabs, summary, raw_fireflies,
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

export async function getMeetingByFirefliesId(firefliesId: string) {
  const { data } = await getAdminClient()
    .from("meetings")
    .select("id")
    .eq("fireflies_id", firefliesId)
    .single();
  return data;
}

/**
 * Batch check which fireflies_ids already exist in the database.
 * Returns a Set of fireflies_ids that are already imported.
 */
export async function getExistingFirefliesIds(firefliesIds: string[]): Promise<Set<string>> {
  if (firefliesIds.length === 0) return new Set();

  const { data } = await getAdminClient()
    .from("meetings")
    .select("fireflies_id")
    .in("fireflies_id", firefliesIds);

  return new Set((data ?? []).map((r) => r.fireflies_id).filter(Boolean));
}

/**
 * Batch check which title+date combinations already exist.
 * Returns a Map of "title|YYYY-MM-DD" -> meeting id for duplicates found.
 * Uses day-level comparison (consistent with getMeetingByTitleAndDate).
 */
export async function getExistingMeetingsByTitleDates(
  pairs: { title: string; date: string }[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (pairs.length === 0) return result;

  const titles = [...new Set(pairs.map((p) => p.title))];
  const { data } = await getAdminClient()
    .from("meetings")
    .select("id, title, date")
    .in("title", titles);

  if (!data) return result;

  for (const row of data) {
    if (row.title && row.date) {
      const dayStr = row.date.slice(0, 10);
      result.set(`${row.title.toLowerCase()}|${dayStr}`, row.id);
    }
  }

  return result;
}

/**
 * Check if a meeting with the same title on the same day already exists.
 * Fireflies creates separate transcripts per team member for the same meeting,
 * each with a unique fireflies_id and slightly different timestamps.
 * We compare on date only (not full timestamp) to catch these duplicates.
 */
export async function getMeetingByTitleAndDate(title: string, date: string) {
  const dayStr = date.slice(0, 10); // "YYYY-MM-DD"
  const { data } = await getAdminClient()
    .from("meetings")
    .select("id, fireflies_id")
    .ilike("title", title)
    .gte("date", `${dayStr}T00:00:00.000Z`)
    .lt("date", `${dayStr}T23:59:59.999Z`)
    .limit(1)
    .maybeSingle();
  return data;
}

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

// ── Q2b-B: helpers voor regenerate / reprocess flows in meeting-pipeline.ts ──

export interface MeetingForRegenerate {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  transcript: string | null;
  transcript_elevenlabs: string | null;
  meeting_participants: { person: { name: string } }[];
}

/**
 * Fetch meeting + transcript-varianten + participant-namen voor de
 * `regenerateMeetingAction` flow. Selecteert alleen wat de pipeline gebruikt
 * — geen `raw_fireflies` of `summary` (die zijn niet nodig voor regenerate
 * van segments + risks).
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getMeetingForRegenerate(
  meetingId: string,
  client?: SupabaseClient,
): Promise<MeetingForRegenerate | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select(
      `id, title, date, meeting_type, party_type, transcript, transcript_elevenlabs,
       meeting_participants(person:people(name))`,
    )
    .eq("id", meetingId)
    .single();

  if (error || !data) return null;
  return data as unknown as MeetingForRegenerate;
}

export interface MeetingForRegenerateRisks extends MeetingForRegenerate {
  raw_fireflies: Record<string, unknown> | null;
}

/**
 * Variant van `getMeetingForRegenerate` voor de `regenerateRisksAction` flow:
 * voegt `raw_fireflies` toe zodat de actie de eerder-geïdentificeerde
 * `identified_projects` kan herbruiken zonder extra Gatekeeper-call.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getMeetingForRegenerateRisks(
  meetingId: string,
  client?: SupabaseClient,
): Promise<MeetingForRegenerateRisks | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select(
      `id, title, date, meeting_type, party_type, transcript, transcript_elevenlabs,
       raw_fireflies, meeting_participants(person:people(name))`,
    )
    .eq("id", meetingId)
    .single();

  if (error || !data) return null;
  return data as unknown as MeetingForRegenerateRisks;
}

export interface MeetingForReprocess {
  id: string;
  fireflies_id: string | null;
  title: string | null;
}

/**
 * Slank meeting-record voor de `reprocessMeetingAction` flow: alleen het
 * minimale dat nodig is voor het park/restore-patroon (`id`, `fireflies_id`,
 * `title`).
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getMeetingForReprocess(
  meetingId: string,
  client?: SupabaseClient,
): Promise<MeetingForReprocess | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select("id, fireflies_id, title")
    .eq("id", meetingId)
    .single();

  if (error || !data) return null;
  return data as MeetingForReprocess;
}

/**
 * Mini-query: 1 kolom (`organization_id`) van een meeting. Gebruikt door de
 * tagger-stap en door segment-feedback acties die de organisatie nodig
 * hebben voor `ignored_entities`-records.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getMeetingOrganizationId(
  meetingId: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select("organization_id")
    .eq("id", meetingId)
    .maybeSingle();

  if (error) {
    console.error("[getMeetingOrganizationId]", error.message);
    return null;
  }
  return (data?.organization_id as string | null) ?? null;
}

/**
 * List the linked `project_id`s of a meeting (uit `meeting_projects`). Apart
 * van `getMeetingForTitleGeneration` omdat dat de project-namen ook ophaalt;
 * deze helper geeft alleen de IDs voor diff-logica in
 * `updateMeetingMetadataAction`.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function listMeetingProjectIds(
  meetingId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meeting_projects")
    .select("project_id")
    .eq("meeting_id", meetingId);

  if (error) {
    console.error("[listMeetingProjectIds]", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.project_id as string);
}

/**
 * List the linked `person_id`s van een meeting (uit `meeting_participants`).
 * Tegengaaster van `listMeetingProjectIds`: alleen IDs, voor diff-logica.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function listMeetingParticipantIds(
  meetingId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meeting_participants")
    .select("person_id")
    .eq("meeting_id", meetingId);

  if (error) {
    console.error("[listMeetingParticipantIds]", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.person_id as string);
}

// ── Q2b-C: helpers voor backfill + reprocess API routes ──

export interface MeetingForBackfill {
  id: string;
  fireflies_id: string | null;
  raw_fireflies: Record<string, unknown> | null;
}

/**
 * Slanke read voor de sentences-backfill route: `id`, `fireflies_id` en het
 * huidige `raw_fireflies`-object (zodat de caller de sentences-array kan
 * mergen zonder overige velden te overschrijven).
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getMeetingForBackfill(
  meetingId: string,
  client?: SupabaseClient,
): Promise<MeetingForBackfill | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select("id, fireflies_id, raw_fireflies")
    .eq("id", meetingId)
    .single();

  if (error || !data) return null;
  return data as MeetingForBackfill;
}

export interface MeetingByFirefliesIdForReprocess {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  participants: string[] | null;
  organization_id: string | null;
  raw_fireflies: Record<string, unknown> | null;
}

/**
 * Variant van `getMeetingByFirefliesId` die de extra velden ophaalt die de
 * reprocess-route nodig heeft voor de hele pipeline (summarize → tagger →
 * risk-specialist). Apart gehouden zodat `getMeetingByFirefliesId` compact
 * blijft voor callers die alleen een id nodig hebben.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getMeetingByFirefliesIdForReprocess(
  firefliesId: string,
  client?: SupabaseClient,
): Promise<MeetingByFirefliesIdForReprocess | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select(
      "id, title, date, meeting_type, party_type, participants, organization_id, raw_fireflies",
    )
    .eq("fireflies_id", firefliesId)
    .single();

  if (error || !data) return null;
  return data as MeetingByFirefliesIdForReprocess;
}
