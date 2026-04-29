import { getAdminClient } from "../../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Regenerate / reprocess / backfill helpers voor meeting-pipeline flows
 * (Q2b-B en Q2b-C). Apart van pipeline-fetches.ts omdat deze queries
 * specifiek transcript-varianten + raw-fireflies ophalen voor herverwerking,
 * niet voor de eerste run.
 */

export interface MeetingForRegenerate {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  /**
   * TH-013 — `summary` is toegevoegd omdat de nieuwe regenerate-flow
   * Gatekeeper + Theme-Detector vóór de Summarizer draait en die agents
   * de huidige summary als classificatie-input gebruiken. Kan null zijn
   * voor meetings die nog geen summary hebben — beide agents handelen
   * een lege string gracieus af.
   */
  summary: string | null;
  transcript: string | null;
  transcript_elevenlabs: string | null;
  transcript_elevenlabs_named: string | null;
  meeting_participants: { person: { name: string } }[];
}

/**
 * Fetch meeting + transcript-varianten + participant-namen voor de
 * `regenerateMeetingAction` flow. TH-013 voegt `summary` toe zodat
 * Gatekeeper + Theme-Detector (die vóór de Summarizer draaien) hun
 * classificatie-input hebben.
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
      `id, title, date, meeting_type, party_type, summary, transcript, transcript_elevenlabs, transcript_elevenlabs_named,
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
      `id, title, date, meeting_type, party_type, transcript, transcript_elevenlabs, transcript_elevenlabs_named,
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
  /** Flat Fireflies-namen op de meetings-row. */
  participants: string[] | null;
  organization_id: string | null;
  raw_fireflies: Record<string, unknown> | null;
  /** Raw Fireflies-transcript — de reprocess-route geeft dit aan de
   *  speaker-mapping-stap als hint voor named cross-reference. */
  transcript: string | null;
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
      "id, title, date, meeting_type, party_type, participants, organization_id, raw_fireflies, transcript",
    )
    .eq("fireflies_id", firefliesId)
    .single();

  if (error || !data) return null;
  return data as MeetingByFirefliesIdForReprocess;
}
