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

const THEME_COLUMNS =
  "id, slug, name, emoji, description, matching_guide, status, created_by_agent, verified_at, verified_by, archived_at, last_mentioned_at, mention_count, created_at, updated_at";

/**
 * All verified themes, alfabetisch op naam. Voedt dashboard-pills en de
 * ThemeTagger-prompt (de agent kiest uit verified + emerging).
 */
export async function listVerifiedThemes(client?: SupabaseClient): Promise<ThemeRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("themes")
    .select(THEME_COLUMNS)
    .eq("status", "verified")
    .order("name", { ascending: true });

  if (error) throw new Error(`themes fetch failed: ${error.message}`);
  return (data ?? []) as ThemeRow[];
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
