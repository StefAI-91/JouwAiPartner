import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import type { ThemeRow } from "./themes";

/**
 * TH-008 — gedeelde helpers voor alle theme-query-files. Kolom-lijst en
 * window-berekening werden hergebruikt tussen base/dashboard/detail/review,
 * dus hier geëxtraheerd om circulaire imports te vermijden.
 */

export const THEME_COLUMNS =
  "id, slug, name, emoji, description, matching_guide, status, created_by_agent, verified_at, verified_by, archived_at, last_mentioned_at, mention_count, created_at, updated_at";

/** Max aantal recente rejections dat als negative_example in de ThemeTagger-prompt landt. */
export const NEGATIVE_EXAMPLES_PER_THEME = 3;

/** Default-venster voor pills + donut — PRD §8 spreekt van "laatste 30 dagen". */
export const DEFAULT_WINDOW_DAYS = 30;

export function windowStartIso(windowDays: number): string {
  const ms = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

/**
 * Samengestelde aggregatie: alle verified themes met ≥1 match-history +
 * per-theme counts en laatste-match-timestamps binnen het window. Shared
 * tussen dashboard pills en donut zodat beiden met één preload toekunnen
 * (TH-008 / FIX-TH-804).
 */
export interface WindowAggregation {
  themes: ThemeRow[];
  counts: Map<string, number>;
  lastSeen: Map<string, string>;
  windowDays: number;
}

/**
 * Fetcht junction-rijen (theme_id + created_at) binnen het window, én de
 * bijbehorende verified themes. Beide queries in parallel; aggregatie gebeurt
 * in JS omdat N (matches × themes) klein blijft in v1.
 *
 * FIX-TH-805: `.gt("mention_count", 0)` filter voorkomt dat themes die nooit
 * matches hadden meereizen. Archived/zero-mention themes vallen op DB-niveau
 * af zodat sorteren in JS niet onnodig werk krijgt.
 *
 * Public export sinds TH-008 zodat `apps/cockpit/app/(dashboard)/page.tsx`
 * de aggregatie één keer kan ophalen en als `preloaded`-prop kan delen met
 * beide dashboard-componenten (4 → 2 DB-calls).
 */
export async function fetchWindowAggregation(
  windowDays: number = DEFAULT_WINDOW_DAYS,
  client?: SupabaseClient,
): Promise<WindowAggregation> {
  const db = client ?? getAdminClient();
  const since = windowStartIso(windowDays);

  const [themesRes, linksRes] = await Promise.all([
    db.from("themes").select(THEME_COLUMNS).eq("status", "verified").gt("mention_count", 0),
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

  return { themes, counts, lastSeen, windowDays };
}
