import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

/**
 * Pipeline-state mutations: transcript-cache, summary, embedding-stale flag,
 * raw-fireflies cache, en park/restore voor reprocessMeetingAction.
 */

export async function updateMeetingElevenLabs(
  meetingId: string,
  data: {
    transcript_elevenlabs: string;
    raw_elevenlabs: Record<string, unknown>;
    audio_url?: string;
  },
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().from("meetings").update(data).eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Slaat de speaker-named versie van het ElevenLabs-transcript op. Cache; mag
 * te allen tijde leeg gezet worden zonder data-verlies — herbouwbaar uit
 * `transcript_elevenlabs` via de speaker-identifier.
 */
export async function updateMeetingNamedTranscript(
  meetingId: string,
  named: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ transcript_elevenlabs_named: named })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMeetingSummary(
  meetingId: string,
  summary: string,
  aiBriefing: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ summary, ai_briefing: aiBriefing })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMeetingSummaryOnly(
  meetingId: string,
  summary: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().from("meetings").update({ summary }).eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMeetingRawFireflies(
  meetingId: string,
  rawFireflies: Record<string, unknown>,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ raw_fireflies: rawFireflies })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function markMeetingEmbeddingStale(
  meetingId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ embedding_stale: true })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Q2b-B: park/restore voor reprocessMeetingAction ──

/**
 * Park een meeting tijdens reprocess: clear `fireflies_id` en prefix de
 * titel zodat beide unique-constraints (`fireflies_id` én
 * `(lower(title), date::date)`) niet botsen wanneer de pipeline een nieuwe
 * meeting probeert te inserten. De oude meeting blijft volledig hersteld
 * baar via `restoreParkedMeeting` zolang de pipeline niet succesvol klaar is.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function parkMeetingForReprocess(
  meetingId: string,
  parkedTitle: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("meetings")
    .update({ fireflies_id: null, title: parkedTitle })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Restore een geparkeerde meeting naar zijn originele staat. Wordt gebruikt
 * als compensating action wanneer de reprocess-pipeline crasht of geen
 * nieuwe meeting kan aanmaken — zo blijft er nooit een meeting in een
 * "halfway"-state achter.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function restoreParkedMeeting(
  meetingId: string,
  firefliesId: string | null,
  title: string | null,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("meetings")
    .update({ fireflies_id: firefliesId, title })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}
