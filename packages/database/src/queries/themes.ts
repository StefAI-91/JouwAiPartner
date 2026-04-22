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
