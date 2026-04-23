import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import { DEFAULT_WINDOW_DAYS, windowStartIso } from "./theme-internals";

/**
 * TH-005 — Detail-page queries: header-badge stats, meetings-tab,
 * decisions-tab, participants-tab. Gesplitst uit `queries/themes.ts` in
 * TH-008 (SRP + file-grootte).
 */

/**
 * TH-011 (UI-332) — party_type normaliseren naar de drie officiële waarden
 * plus `null` voor meetings waar hij niet is gezet. Alles buiten deze set
 * valt naar null zodat de UI-groepering voorspelbaar blijft.
 */
function normalizePartyType(raw: string | null): "internal" | "external" | "mixed" | null {
  if (raw === "internal" || raw === "external" || raw === "mixed") return raw;
  return null;
}

export interface ThemeRecentActivity {
  /** Aantal matches binnen het window. */
  mentions: number;
  /** ISO-timestamp van de meest recente match, ongeacht window. Null als nooit. */
  lastMentionedAt: string | null;
  windowDays: number;
}

export interface ThemeMeetingExtraction {
  id: string;
  type: string;
  content: string;
}

export interface ThemeMeetingEntry {
  meeting_id: string;
  title: string | null;
  date: string | null;
  participants: string[] | null;
  /** TH-011 (UI-332) — party_type voor de drie-kolom split op theme detail. */
  party_type: "internal" | "external" | "mixed" | null;
  confidence: "medium" | "high";
  evidence_quote: string;
  /**
   * TH-010 — 1-2 zinnen narrative van wat deze meeting specifiek over dit
   * thema besprak. Null voor pre-TH-010 matches of proposal-links.
   */
  summary: string | null;
  matched_at: string;
  /**
   * TH-010 — Extractions die dít thema dragen binnen deze meeting, via de
   * `extraction_themes`-junction. Lege array wanneer de match pre-TH-010 is
   * of wanneer de Tagger geen extractionIds teruggaf (EDGE-220).
   */
  extractions: ThemeMeetingExtraction[];
}

export interface ThemeDecisionEntry {
  extraction_id: string;
  meeting_id: string;
  meeting_title: string | null;
  meeting_date: string | null;
  content: string;
  created_at: string;
}

export interface ThemeParticipantEntry {
  person_id: string;
  name: string;
  meeting_count: number;
}

/**
 * Header-badge data: hoeveel mentions binnen het window + absolute laatste
 * match-tijd. Lastige stat omdat de gedenormaliseerde `last_mentioned_at` op
 * themes cumulatief is; we halen deze 30d-specifieke waarden dus uit de
 * junction-tabel zelf.
 *
 * TH-009: bewust 2 parallelle queries — `count` is window-filtered (30d),
 * `lastMentionedAt` is ongefilterd (all-time). Een thema dat >30d geen match
 * had moet nog steeds zijn laatste mention tonen. Eén query samenvoegen zou
 * één van beide semantieken moeten opgeven.
 */
export async function getThemeRecentActivity(
  themeId: string,
  options?: { windowDays?: number },
  client?: SupabaseClient,
): Promise<ThemeRecentActivity> {
  const windowDays = options?.windowDays ?? DEFAULT_WINDOW_DAYS;
  const db = client ?? getAdminClient();
  const since = windowStartIso(windowDays);

  const [countRes, latestRes] = await Promise.all([
    db
      .from("meeting_themes")
      .select("meeting_id", { count: "exact", head: true })
      .eq("theme_id", themeId)
      .gte("created_at", since),
    db
      .from("meeting_themes")
      .select("created_at")
      .eq("theme_id", themeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (countRes.error) throw new Error(`theme activity count failed: ${countRes.error.message}`);
  if (latestRes.error) throw new Error(`theme last-mention failed: ${latestRes.error.message}`);

  return {
    mentions: countRes.count ?? 0,
    lastMentionedAt: latestRes.data?.created_at ?? null,
    windowDays,
  };
}

/**
 * Alle meetings die dit thema raken, desc op meeting-datum. Voedt de
 * Meetings-tab met evidence-quote per match (UI-272). Eén query met join op
 * `meetings` via Supabase relational select — meeting_themes is de source
 * of truth voor de match-metadata (confidence/quote/matched_at).
 *
 * TH-009 (herzien): we sorteren SQL-side op `meeting_themes.created_at` en
 * daarna JS-side op meeting.date. De eerdere poging met
 * `referencedTable: "meetings"` brak in productie omdat de select een alias
 * (`meeting:meeting_id`) gebruikt en PostgREST de alias verwacht, niet de
 * tabelnaam. Twee sorts is acceptabel voor de ~tientallen rows per thema.
 */
export async function getThemeMeetings(
  themeId: string,
  client?: SupabaseClient,
): Promise<ThemeMeetingEntry[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meeting_themes")
    .select(
      "confidence, evidence_quote, summary, created_at, meeting:meeting_id (id, title, date, participants, party_type)",
    )
    .eq("theme_id", themeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`theme meetings failed: ${error.message}`);

  type JoinRow = {
    confidence: "medium" | "high";
    evidence_quote: string;
    summary: string | null;
    created_at: string;
    meeting: {
      id: string;
      title: string | null;
      date: string | null;
      participants: string[] | null;
      party_type: string | null;
    } | null;
  };

  const entries = ((data ?? []) as unknown as JoinRow[])
    .filter((row) => row.meeting !== null)
    .map((row) => ({
      meeting_id: row.meeting!.id,
      title: row.meeting!.title,
      date: row.meeting!.date,
      participants: row.meeting!.participants,
      party_type: normalizePartyType(row.meeting!.party_type),
      confidence: row.confidence,
      evidence_quote: row.evidence_quote,
      summary: row.summary,
      matched_at: row.created_at,
      extractions: [] as ThemeMeetingExtraction[],
    }));

  // TH-010 — laad gekoppelde extractions via extraction_themes en groepeer
  // per meeting. Eén extra query, desc geen nested relational select want
  // we hebben ook de join naar `extractions.meeting_id` nodig.
  const meetingIds = entries.map((e) => e.meeting_id);
  if (meetingIds.length > 0) {
    const { data: linkRows, error: linkErr } = await db
      .from("extraction_themes")
      .select("extraction:extraction_id (id, type, content, meeting_id)")
      .eq("theme_id", themeId);
    if (linkErr) throw new Error(`theme extraction-links failed: ${linkErr.message}`);

    type LinkRow = {
      extraction: {
        id: string;
        type: string;
        content: string;
        meeting_id: string;
      } | null;
    };

    const byMeeting = new Map<string, ThemeMeetingExtraction[]>();
    for (const row of (linkRows ?? []) as unknown as LinkRow[]) {
      if (!row.extraction) continue;
      const list = byMeeting.get(row.extraction.meeting_id);
      const item: ThemeMeetingExtraction = {
        id: row.extraction.id,
        type: row.extraction.type,
        content: row.extraction.content,
      };
      if (list) list.push(item);
      else byMeeting.set(row.extraction.meeting_id, [item]);
    }

    for (const entry of entries) {
      entry.extractions = byMeeting.get(entry.meeting_id) ?? [];
    }
  }

  return entries.sort((a, b) => {
    const aDate = a.date ?? a.matched_at;
    const bDate = b.date ?? b.matched_at;
    return bDate.localeCompare(aDate);
  });
}

/**
 * Alle `type='decision'` extractions uit de meetings die aan dit thema
 * gekoppeld zijn. Desc op extraction.created_at zodat meest recente boven
 * staan. Twee round-trips (match-ids → extractions) is schoner dan een
 * Supabase nested-relational query die alle extractions zou ophalen en in
 * JS filteren.
 */
export async function getThemeDecisions(
  themeId: string,
  client?: SupabaseClient,
): Promise<ThemeDecisionEntry[]> {
  const db = client ?? getAdminClient();

  const { data: links, error: linksErr } = await db
    .from("meeting_themes")
    .select("meeting_id")
    .eq("theme_id", themeId);
  if (linksErr) throw new Error(`theme decisions (links) failed: ${linksErr.message}`);

  const meetingIds = (links ?? []).map((l) => l.meeting_id);
  if (meetingIds.length === 0) return [];

  const { data, error } = await db
    .from("extractions")
    .select("id, meeting_id, content, created_at, meeting:meeting_id (title, date)")
    .in("meeting_id", meetingIds)
    .eq("type", "decision")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`theme decisions failed: ${error.message}`);

  type DecisionRow = {
    id: string;
    meeting_id: string;
    content: string;
    created_at: string;
    meeting: { title: string | null; date: string | null } | null;
  };

  return ((data ?? []) as unknown as DecisionRow[]).map((row) => ({
    extraction_id: row.id,
    meeting_id: row.meeting_id,
    meeting_title: row.meeting?.title ?? null,
    meeting_date: row.meeting?.date ?? null,
    content: row.content,
    created_at: row.created_at,
  }));
}

/**
 * Unieke people die in meetings zaten die aan dit thema gekoppeld zijn, met
 * hoeveelheid van die meetings. `meeting_participants` is de junction waar
 * person_id op staat — participants-array op `meetings` is de raw Fireflies-
 * lijst en koppelt niet aan `people`. Sort desc op meeting_count.
 */
export async function getThemeParticipants(
  themeId: string,
  client?: SupabaseClient,
): Promise<ThemeParticipantEntry[]> {
  const db = client ?? getAdminClient();

  const { data: links, error: linksErr } = await db
    .from("meeting_themes")
    .select("meeting_id")
    .eq("theme_id", themeId);
  if (linksErr) throw new Error(`theme participants (links) failed: ${linksErr.message}`);

  const meetingIds = (links ?? []).map((l) => l.meeting_id);
  if (meetingIds.length === 0) return [];

  const { data, error } = await db
    .from("meeting_participants")
    .select("meeting_id, person_id, person:person_id (id, name)")
    .in("meeting_id", meetingIds)
    .not("person_id", "is", null);

  if (error) throw new Error(`theme participants failed: ${error.message}`);

  type PartRow = {
    meeting_id: string;
    person_id: string;
    person: { id: string; name: string } | null;
  };

  const counts = new Map<string, { name: string; count: number }>();
  for (const row of (data ?? []) as unknown as PartRow[]) {
    if (!row.person) continue;
    const existing = counts.get(row.person.id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(row.person.id, { name: row.person.name, count: 1 });
    }
  }

  return Array.from(counts.entries())
    .map(([person_id, v]) => ({
      person_id,
      name: v.name,
      meeting_count: v.count,
    }))
    .sort((a, b) => {
      if (b.meeting_count !== a.meeting_count) return b.meeting_count - a.meeting_count;
      return a.name.localeCompare(b.name);
    });
}
