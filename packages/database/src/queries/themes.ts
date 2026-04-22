import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface ThemeRow {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  description: string;
  matching_guide: string;
  status: "emerging" | "verified" | "archived";
  created_by_agent: string | null;
  verified_at: string | null;
  verified_by: string | null;
  archived_at: string | null;
  last_mentioned_at: string | null;
  mention_count: number;
  created_at: string;
  updated_at: string;
}

export interface ThemeRejectionExample {
  theme_id: string;
  meeting_id: string;
  evidence_quote: string;
  reason: "niet_substantieel" | "ander_thema" | "te_breed";
  rejected_at: string;
}

export interface ThemeWithNegativeExamples extends ThemeRow {
  negative_examples: ThemeRejectionExample[];
}

const THEME_COLUMNS =
  "id, slug, name, emoji, description, matching_guide, status, created_by_agent, verified_at, verified_by, archived_at, last_mentioned_at, mention_count, created_at, updated_at";

/** Max aantal recente rejections dat als negative_example in de ThemeTagger-prompt landt. */
const NEGATIVE_EXAMPLES_PER_THEME = 3;

export interface ListVerifiedThemesOptions {
  /**
   * Bij `true` wordt elke theme aangevuld met de laatste 2-3 rejections uit
   * `theme_match_rejections`. Pipeline (TH-003) gebruikt dit om de feedback-
   * loop in de ThemeTagger-prompt te injecteren. Default: false — pills en
   * donut op het dashboard hebben de negatives niet nodig.
   */
  includeNegativeExamples?: boolean;
}

/**
 * All verified themes, alfabetisch op naam. Voedt dashboard-pills en de
 * ThemeTagger-prompt. Overloads zorgen dat callers met
 * `includeNegativeExamples: true` type-correct toegang hebben tot het
 * `negative_examples`-veld zonder manuele cast.
 */
export async function listVerifiedThemes(
  options: { includeNegativeExamples: true },
  client?: SupabaseClient,
): Promise<ThemeWithNegativeExamples[]>;
export async function listVerifiedThemes(
  options?: ListVerifiedThemesOptions,
  client?: SupabaseClient,
): Promise<ThemeRow[]>;
export async function listVerifiedThemes(
  options?: ListVerifiedThemesOptions,
  client?: SupabaseClient,
): Promise<ThemeRow[] | ThemeWithNegativeExamples[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("themes")
    .select(THEME_COLUMNS)
    .eq("status", "verified")
    .order("name", { ascending: true });

  if (error) throw new Error(`themes fetch failed: ${error.message}`);
  const themes = (data ?? []) as ThemeRow[];

  if (!options?.includeNegativeExamples) return themes;

  const themeIds = themes.map((t) => t.id);
  if (themeIds.length === 0) return themes.map((t) => ({ ...t, negative_examples: [] }));

  const { data: rejections, error: rejErr } = await db
    .from("theme_match_rejections")
    .select("theme_id, meeting_id, evidence_quote, reason, rejected_at")
    .in("theme_id", themeIds)
    .order("rejected_at", { ascending: false });

  if (rejErr) throw new Error(`theme rejections fetch failed: ${rejErr.message}`);

  const byTheme = new Map<string, ThemeRejectionExample[]>();
  for (const row of (rejections ?? []) as ThemeRejectionExample[]) {
    const arr = byTheme.get(row.theme_id) ?? [];
    if (arr.length < NEGATIVE_EXAMPLES_PER_THEME) {
      arr.push(row);
      byTheme.set(row.theme_id, arr);
    }
  }

  return themes.map((t) => ({ ...t, negative_examples: byTheme.get(t.id) ?? [] }));
}

/**
 * Single theme by slug. Gebruikt door detail-page (TH-005) en regenerate
 * (TH-006). Returnt null als theme niet bestaat of gearchiveerd is — de
 * caller beslist of dat een 404 of een fallback wordt.
 */
export async function getThemeBySlug(
  slug: string,
  client?: SupabaseClient,
): Promise<ThemeRow | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("themes")
    .select(THEME_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`theme fetch failed: ${error.message}`);
  return (data as ThemeRow | null) ?? null;
}

export interface TopActiveTheme {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  mentions30d: number;
  lastMentionedAt: string | null;
}

export interface ThemeShareSlice {
  theme: { id: string; slug: string; name: string; emoji: string };
  mentions: number;
  share: number;
}

export interface ThemeShareDistribution {
  slices: ThemeShareSlice[];
  totalMentions: number;
  windowDays: number;
}

/** Default-venster voor pills + donut — PRD §8 spreekt van "laatste 30 dagen". */
const DEFAULT_WINDOW_DAYS = 30;

function windowStartIso(windowDays: number): string {
  const ms = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

/**
 * Fetcht junction-rijen (theme_id + created_at) binnen het window, én de
 * bijbehorende verified themes. Beide queries in parallel; aggregatie gebeurt
 * in JS om Supabase-restricties op group-by te omzeilen en omdat N (aantal
 * meetings × matches) altijd klein blijft in v1.
 */
async function fetchWindowAggregation(
  windowDays: number,
  client: SupabaseClient | undefined,
): Promise<{ themes: ThemeRow[]; counts: Map<string, number>; lastSeen: Map<string, string> }> {
  const db = client ?? getAdminClient();
  const since = windowStartIso(windowDays);

  const [themesRes, linksRes] = await Promise.all([
    db.from("themes").select(THEME_COLUMNS).eq("status", "verified"),
    db.from("meeting_themes").select("theme_id, created_at").gte("created_at", since),
  ]);

  if (themesRes.error) throw new Error(`themes fetch failed: ${themesRes.error.message}`);
  if (linksRes.error)
    throw new Error(`meeting_themes aggregation failed: ${linksRes.error.message}`);

  const themes = (themesRes.data ?? []) as ThemeRow[];
  const counts = new Map<string, number>();
  const lastSeen = new Map<string, string>();

  for (const row of (linksRes.data ?? []) as Array<{ theme_id: string; created_at: string }>) {
    counts.set(row.theme_id, (counts.get(row.theme_id) ?? 0) + 1);
    const prev = lastSeen.get(row.theme_id);
    if (!prev || prev < row.created_at) lastSeen.set(row.theme_id, row.created_at);
  }

  return { themes, counts, lastSeen };
}

/**
 * Top-N verified themes binnen het window, gesorteerd op mentions desc. Tie-
 * breaker: `last_mentioned_at` desc zodat recent-actief voorrang krijgt op
 * oud-vaak. Themes met 0 mentions in het window vallen af. Lege array als
 * er nog geen matches zijn — caller toont empty-state.
 */
export async function listTopActiveThemes(
  options?: { limit?: number; windowDays?: number },
  client?: SupabaseClient,
): Promise<TopActiveTheme[]> {
  const limit = options?.limit ?? 8;
  const windowDays = options?.windowDays ?? DEFAULT_WINDOW_DAYS;
  const { themes, counts, lastSeen } = await fetchWindowAggregation(windowDays, client);

  const withMentions = themes
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      emoji: t.emoji,
      mentions30d: counts.get(t.id) ?? 0,
      lastMentionedAt: lastSeen.get(t.id) ?? t.last_mentioned_at,
    }))
    .filter((t) => t.mentions30d > 0);

  withMentions.sort((a, b) => {
    if (b.mentions30d !== a.mentions30d) return b.mentions30d - a.mentions30d;
    const aTs = a.lastMentionedAt ?? "";
    const bTs = b.lastMentionedAt ?? "";
    return bTs.localeCompare(aTs);
  });

  return withMentions.slice(0, limit);
}

/**
 * Percentage-verdeling van alle verified themes met ≥1 mention binnen het
 * window. Slices sommeren niet precies naar 100% omdat `share` per slice
 * naar beneden wordt afgerond; de caller kan center-label op basis van
 * `totalMentions` tonen.
 */
export async function getThemeShareDistribution(
  options?: { windowDays?: number },
  client?: SupabaseClient,
): Promise<ThemeShareDistribution> {
  const windowDays = options?.windowDays ?? DEFAULT_WINDOW_DAYS;
  const { themes, counts, lastSeen } = await fetchWindowAggregation(windowDays, client);

  const withMentions = themes
    .map((t) => ({
      theme: { id: t.id, slug: t.slug, name: t.name, emoji: t.emoji },
      mentions: counts.get(t.id) ?? 0,
      lastMentionedAt: lastSeen.get(t.id) ?? t.last_mentioned_at,
    }))
    .filter((t) => t.mentions > 0);

  const totalMentions = withMentions.reduce((sum, t) => sum + t.mentions, 0);

  const slices: ThemeShareSlice[] = withMentions
    .map((t) => ({
      theme: t.theme,
      mentions: t.mentions,
      share: totalMentions > 0 ? t.mentions / totalMentions : 0,
    }))
    .sort((a, b) => {
      if (b.mentions !== a.mentions) return b.mentions - a.mentions;
      return a.theme.name.localeCompare(b.theme.name);
    });

  return { slices, totalMentions, windowDays };
}

// ──────────────────────────────────────────────────────────────────────────
// TH-005 — Detail-page queries
// ──────────────────────────────────────────────────────────────────────────

export interface ThemeRecentActivity {
  /** Aantal matches binnen het window. */
  mentions: number;
  /** ISO-timestamp van de meest recente match, ongeacht window. Null als nooit. */
  lastMentionedAt: string | null;
  windowDays: number;
}

export interface ThemeMeetingEntry {
  meeting_id: string;
  title: string | null;
  date: string | null;
  participants: string[] | null;
  confidence: "medium" | "high";
  evidence_quote: string;
  matched_at: string;
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
 */
export async function getThemeMeetings(
  themeId: string,
  client?: SupabaseClient,
): Promise<ThemeMeetingEntry[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meeting_themes")
    .select(
      "confidence, evidence_quote, created_at, meeting:meeting_id (id, title, date, participants)",
    )
    .eq("theme_id", themeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`theme meetings failed: ${error.message}`);

  type JoinRow = {
    confidence: "medium" | "high";
    evidence_quote: string;
    created_at: string;
    meeting: {
      id: string;
      title: string | null;
      date: string | null;
      participants: string[] | null;
    } | null;
  };

  return ((data ?? []) as unknown as JoinRow[])
    .filter((row) => row.meeting !== null)
    .map((row) => ({
      meeting_id: row.meeting!.id,
      title: row.meeting!.title,
      date: row.meeting!.date,
      participants: row.meeting!.participants,
      confidence: row.confidence,
      evidence_quote: row.evidence_quote,
      matched_at: row.created_at,
    }))
    .sort((a, b) => {
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

export interface EmergingThemeProposalMeeting {
  meeting_id: string;
  title: string | null;
  date: string | null;
  evidence_quote: string;
}

export interface EmergingThemeRow extends ThemeRow {
  /** Meetings die deze emerging theme triggerden; leeg als de pipeline nog geen origin-link legde. */
  proposal_meetings: EmergingThemeProposalMeeting[];
}

/**
 * TH-006 — emerging themes voor de review-sectie. Haalt alle `status='emerging'`
 * themes op met per theme de 2-3 meetings die hem triggerden (UI-292: "Gevonden
 * in:"). Proposal-origin wordt via `meeting_themes` geregistreerd in de
 * tag-themes pipeline step, dus we hergebruiken die join.
 */
export async function listEmergingThemes(client?: SupabaseClient): Promise<EmergingThemeRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("themes")
    .select(THEME_COLUMNS)
    .eq("status", "emerging")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`emerging themes fetch failed: ${error.message}`);
  const themes = (data ?? []) as ThemeRow[];
  if (themes.length === 0) return [];

  const themeIds = themes.map((t) => t.id);
  const { data: links, error: linksErr } = await db
    .from("meeting_themes")
    .select("theme_id, evidence_quote, created_at, meeting:meeting_id (id, title, date)")
    .in("theme_id", themeIds)
    .order("created_at", { ascending: false });

  if (linksErr) throw new Error(`emerging themes meetings failed: ${linksErr.message}`);

  type LinkRow = {
    theme_id: string;
    evidence_quote: string;
    created_at: string;
    meeting: { id: string; title: string | null; date: string | null } | null;
  };

  const byTheme = new Map<string, EmergingThemeProposalMeeting[]>();
  for (const row of (links ?? []) as unknown as LinkRow[]) {
    if (!row.meeting) continue;
    const arr = byTheme.get(row.theme_id) ?? [];
    if (arr.length >= 3) continue; // max 2-3 meetings per card
    arr.push({
      meeting_id: row.meeting.id,
      title: row.meeting.title,
      date: row.meeting.date,
      evidence_quote: row.evidence_quote,
    });
    byTheme.set(row.theme_id, arr);
  }

  return themes.map((t) => ({
    ...t,
    proposal_meetings: byTheme.get(t.id) ?? [],
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
