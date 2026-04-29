import { getAdminClient } from "../../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Speaker-mapping queries: backfill-tellingen, candidate-lijsten en de
 * rich-participant-projectie voor de speaker-identifier agent. Apart
 * gehouden van pipeline-fetches.ts omdat de backfill-UI en de speaker-
 * mapping pipeline-stap een eigen sub-domein vormen rondom
 * `transcript_elevenlabs` / `transcript_elevenlabs_named`.
 */

export interface SpeakerMappingParticipant {
  name: string;
  role: string | null;
  organization: string | null;
  organization_type: string | null;
}

/**
 * Tellingen voor de speaker-mapping backfill-UI: hoeveel meetings hebben een
 * raw ElevenLabs-transcript en hoeveel daarvan zijn al door speaker-mapping
 * gehaald. `without_named` = werk wat nog open staat zonder force-flag.
 */
export interface SpeakerMappingTranscriptCounts {
  with_elevenlabs: number;
  with_named: number;
}

export async function getSpeakerMappingTranscriptCounts(
  client?: SupabaseClient,
): Promise<SpeakerMappingTranscriptCounts | { error: string }> {
  const db = client ?? getAdminClient();
  const [withEleven, withNamed] = await Promise.all([
    db
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .not("transcript_elevenlabs", "is", null),
    db
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .not("transcript_elevenlabs_named", "is", null),
  ]);
  if (withEleven.error) return { error: withEleven.error.message };
  if (withNamed.error) return { error: withNamed.error.message };
  return {
    with_elevenlabs: withEleven.count ?? 0,
    with_named: withNamed.count ?? 0,
  };
}

/**
 * Telt hoeveel meetings nog door de backfill heen moeten. Met `includeMapped`
 * = true negeert het de named-flag (force-modus): alle meetings met een
 * ElevenLabs-transcript komen in aanmerking.
 */
export async function countSpeakerMappingBackfillRemaining(
  includeMapped: boolean,
  client?: SupabaseClient,
): Promise<number | { error: string }> {
  const db = client ?? getAdminClient();
  let query = db
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .not("transcript_elevenlabs", "is", null);
  if (!includeMapped) {
    query = query.is("transcript_elevenlabs_named", null);
  }
  const { count, error } = await query;
  if (error) return { error: error.message };
  return count ?? 0;
}

export interface SpeakerMappingBackfillCandidate {
  id: string;
  title: string | null;
  date: string | null;
  /** Raw Fireflies (kolom `transcript`) — gebruikt door speaker-identifier
   *  als cross-reference voor named-utterances. */
  transcript_fireflies: string | null;
  /** Raw ElevenLabs-transcript — input voor de mapping. */
  transcript_elevenlabs: string | null;
}

/**
 * Lijst meetings die in aanmerking komen voor speaker-mapping backfill,
 * inclusief de transcripten zelf zodat de caller geen extra query nodig heeft.
 *
 * Met `includeMapped` = true (force-modus) selecteert het ook meetings die al
 * een named-versie hebben — bedoeld om opnieuw te mappen na prompt-update.
 */
export async function listSpeakerMappingBackfillCandidates(
  limit: number,
  includeMapped: boolean,
  client?: SupabaseClient,
): Promise<SpeakerMappingBackfillCandidate[]> {
  const db = client ?? getAdminClient();
  let query = db
    .from("meetings")
    .select("id, title, date, transcript, transcript_elevenlabs")
    .not("transcript_elevenlabs", "is", null);
  if (!includeMapped) {
    query = query.is("transcript_elevenlabs_named", null);
  }
  query = query.order("date", { ascending: false, nullsFirst: false }).limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("[listSpeakerMappingBackfillCandidates]", error.message);
    return [];
  }
  type Raw = {
    id: string;
    title: string | null;
    date: string | null;
    transcript: string | null;
    transcript_elevenlabs: string | null;
  };
  return ((data ?? []) as Raw[]).map((m) => ({
    id: m.id,
    title: m.title,
    date: m.date,
    transcript_fireflies: m.transcript,
    transcript_elevenlabs: m.transcript_elevenlabs,
  }));
}

/**
 * Compacte query voor de speaker-mapping pipeline-stap: alleen rich participant
 * info (name + role + organization + type) — geen transcript-data, geen
 * meeting-context. Lijkt op de participant-mapping in `getMeetingForGoldenCoder`
 * maar zonder flat-Fireflies-fallback want voor speaker-identifier hebben we
 * alleen de DB-deelnemers nodig.
 */
export async function getMeetingParticipantsForSpeakerMapping(
  meetingId: string,
  client?: SupabaseClient,
): Promise<SpeakerMappingParticipant[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select(
      `meeting_participants(person:people(name, role, organization:organizations(name, type)))`,
    )
    .eq("id", meetingId)
    .single();

  if (error || !data) return [];

  type RawPerson = {
    name: string;
    role: string | null;
    organization: { name: string | null; type: string | null } | null;
  };
  const raw = data as unknown as {
    meeting_participants: { person: RawPerson | null }[];
  };
  return raw.meeting_participants
    .map((mp) => mp.person)
    .filter((p): p is RawPerson => p !== null)
    .map((p) => ({
      name: p.name,
      role: p.role,
      organization: p.organization?.name ?? null,
      organization_type: p.organization?.type ?? null,
    }));
}
