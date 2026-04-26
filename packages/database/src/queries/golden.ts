import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

/**
 * Queries voor de Action Item golden-dataset. Lees-alleen — de coding-UI
 * schrijft via mutations/golden. Drie use cases:
 *   1. Picker-pagina toont alle verified meetings + hun coding-status
 *   2. Coder-pagina laadt één meeting met volledige context
 *   3. Coder-pagina laadt bestaande golden items voor edit
 *
 * "coded met 0 items" en "ungecodeerd" zijn verschillende states. Daarom is
 * er een aparte action_item_golden_meetings tabel die als statusbron dient.
 */

export interface MeetingWithGoldenStatus {
  meeting_id: string;
  title: string;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  organization_name: string | null;
  participant_count: number;
  golden_status: "uncoded" | "coded" | "skipped";
  golden_item_count: number;
  encoded_at: string | null;
}

export interface GoldenCoderParticipant {
  id: string;
  name: string;
  /** Functie / rol binnen organisatie (bv. "CEO", "lead developer"). */
  role: string | null;
  /** Naam van de organisatie waar deze persoon werkt (bv. "JAIP", "Acme BV"). */
  organization: string | null;
  /** Type organisatie (bv. "internal", "client", "partner"). Helpt het model
   *  meteen te zien wie JAIP is en wie extern, zonder naam-pattern-matching. */
  organization_type: string | null;
}

export interface MeetingForGoldenCoder {
  id: string;
  title: string;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  summary: string | null;
  transcript: string | null;
  /** Welke transcript-bron we daadwerkelijk teruggeven in `transcript`.
   *  ElevenLabs Scribe v2 wordt verkozen boven Fireflies wanneer beide
   *  beschikbaar zijn (zelfde voorkeur als gatekeeper-pipeline). */
  transcript_source: "elevenlabs" | "fireflies" | null;
  participants: GoldenCoderParticipant[];
}

export interface GoldenItemRow {
  id: string;
  content: string;
  follow_up_contact: string;
  assignee: string | null;
  source_quote: string | null;
  category: string | null;
  deadline: string | null;
  lane: string;
  type_werk: string;
  project_context: string | null;
  coder_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoldenMeetingState {
  status: "coded" | "skipped";
  encoded_at: string;
  notes: string | null;
}

/**
 * Picker-pagina: alle verified meetings + hun coding-status.
 * LEFT JOIN op golden-tabellen zodat ungecodeerde meetings ook verschijnen.
 */
export async function listMeetingsWithGoldenStatus(
  client?: SupabaseClient,
  { limit = 200 }: { limit?: number } = {},
): Promise<MeetingWithGoldenStatus[]> {
  const db = client ?? getAdminClient();

  const { data: meetings, error } = await db
    .from("meetings")
    .select(
      `id, title, date, meeting_type, party_type,
       organization:organizations(name),
       meeting_participants(person:people(id))`,
    )
    .eq("verification_status", "verified")
    .order("date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(`listMeetingsWithGoldenStatus failed: ${error.message}`);

  const meetingIds = (meetings ?? []).map((m) => m.id);
  if (meetingIds.length === 0) return [];

  const [{ data: states, error: stErr }, { data: counts, error: cnErr }] = await Promise.all([
    db
      .from("action_item_golden_meetings")
      .select("meeting_id, status, encoded_at")
      .in("meeting_id", meetingIds),
    db.from("action_item_golden_items").select("meeting_id").in("meeting_id", meetingIds),
  ]);

  if (stErr) throw new Error(`golden-meetings lookup failed: ${stErr.message}`);
  if (cnErr) throw new Error(`golden-items lookup failed: ${cnErr.message}`);

  const stateById = new Map(
    (states ?? []).map((s) => [s.meeting_id, { status: s.status, encoded_at: s.encoded_at }]),
  );
  const itemCountById = new Map<string, number>();
  for (const row of counts ?? []) {
    itemCountById.set(row.meeting_id, (itemCountById.get(row.meeting_id) ?? 0) + 1);
  }

  type RawMeeting = {
    id: string;
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    party_type: string | null;
    organization: { name: string } | null;
    meeting_participants: { person: { id: string } | null }[];
  };

  return ((meetings ?? []) as unknown as RawMeeting[]).map((m) => {
    const state = stateById.get(m.id);
    const status: MeetingWithGoldenStatus["golden_status"] = state
      ? (state.status as "coded" | "skipped")
      : "uncoded";
    return {
      meeting_id: m.id,
      title: m.title ?? "(geen titel)",
      date: m.date,
      meeting_type: m.meeting_type,
      party_type: m.party_type,
      organization_name: m.organization?.name ?? null,
      participant_count: m.meeting_participants?.length ?? 0,
      golden_status: status,
      golden_item_count: itemCountById.get(m.id) ?? 0,
      encoded_at: state?.encoded_at ?? null,
    };
  });
}

/**
 * Coder-pagina: volledige meeting-context inclusief transcript zodat de coder
 * source_quotes kan kopiëren.
 */
export async function getMeetingForGoldenCoder(
  meetingId: string,
  client?: SupabaseClient,
): Promise<MeetingForGoldenCoder | null> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("meetings")
    .select(
      `id, title, date, meeting_type, party_type, summary, transcript, transcript_elevenlabs,
       meeting_participants(person:people(id, name, role, organization:organizations(name, type)))`,
    )
    .eq("id", meetingId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getMeetingForGoldenCoder failed: ${error.message}`);
  }

  type RawPerson = {
    id: string;
    name: string;
    role: string | null;
    organization: { name: string | null; type: string | null } | null;
  };
  type Raw = {
    id: string;
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    party_type: string | null;
    summary: string | null;
    transcript: string | null;
    transcript_elevenlabs: string | null;
    meeting_participants: { person: RawPerson | null }[];
  };

  const raw = data as unknown as Raw;
  const transcript = raw.transcript_elevenlabs ?? raw.transcript ?? null;
  const transcript_source: MeetingForGoldenCoder["transcript_source"] = raw.transcript_elevenlabs
    ? "elevenlabs"
    : raw.transcript
      ? "fireflies"
      : null;
  return {
    id: raw.id,
    title: raw.title ?? "(geen titel)",
    date: raw.date,
    meeting_type: raw.meeting_type,
    party_type: raw.party_type,
    summary: raw.summary,
    transcript,
    transcript_source,
    participants: raw.meeting_participants
      .map((mp) => mp.person)
      .filter((p): p is RawPerson => p !== null)
      .map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        organization: p.organization?.name ?? null,
        organization_type: p.organization?.type ?? null,
      })),
  };
}

/**
 * Coder-pagina + harness: bestaande golden-state voor een meeting.
 * Retourneert ook items (mogelijk lege array) als de meeting al gecodeerd is.
 */
export async function getGoldenForMeeting(
  meetingId: string,
  client?: SupabaseClient,
): Promise<{ state: GoldenMeetingState | null; items: GoldenItemRow[] }> {
  const db = client ?? getAdminClient();

  const [{ data: state, error: stErr }, { data: items, error: itErr }] = await Promise.all([
    db
      .from("action_item_golden_meetings")
      .select("status, encoded_at, notes")
      .eq("meeting_id", meetingId)
      .maybeSingle(),
    db
      .from("action_item_golden_items")
      .select(
        "id, content, follow_up_contact, assignee, source_quote, category, " +
          "deadline, lane, type_werk, project_context, coder_notes, created_at, updated_at",
      )
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true }),
  ]);

  if (stErr) throw new Error(`getGoldenForMeeting state failed: ${stErr.message}`);
  if (itErr) throw new Error(`getGoldenForMeeting items failed: ${itErr.message}`);

  return {
    state: state
      ? {
          status: state.status as "coded" | "skipped",
          encoded_at: state.encoded_at,
          notes: state.notes,
        }
      : null,
    items: (items ?? []) as unknown as GoldenItemRow[],
  };
}
