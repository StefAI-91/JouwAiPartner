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
