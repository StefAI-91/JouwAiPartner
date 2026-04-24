import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

/**
 * TH-008 — gedeelde helpers voor alle theme-query-files. Kolom-lijst en
 * window-berekening werden hergebruikt tussen base/dashboard/detail/review,
 * dus hier geëxtraheerd om circulaire imports te vermijden.
 */

/**
 * TH-009 — split van THEME_COLUMNS in BASIC/FULL. Pills + donut
 * (`fetchWindowAggregation`) hebben alleen id/slug/name/emoji +
 * mention_count + last_mentioned_at nodig. Over de wire scheelt dat ~60%
 * bytes per row bij grote catalogs (Supabase encodeert tekst).
 *
 * `THEME_COLUMNS` is een re-export van FULL voor backwards-compat van
 * bestaande call-sites (listVerifiedThemes / getThemeBySlug / listEmergingThemes).
 */
export const THEME_COLUMNS_BASIC = "id, slug, name, emoji, mention_count, last_mentioned_at";
export const THEME_COLUMNS_FULL =
  "id, slug, name, emoji, description, matching_guide, status, created_by_agent, verified_at, verified_by, archived_at, last_mentioned_at, mention_count, origin_meeting_id, created_at, updated_at";
export const THEME_COLUMNS = THEME_COLUMNS_FULL;

/** Max aantal recente rejections dat als negative_example in de ThemeTagger-prompt landt. */
export const NEGATIVE_EXAMPLES_PER_THEME = 3;

/** Default-venster voor pills + donut — PRD §8 spreekt van "laatste 30 dagen". */
export const DEFAULT_WINDOW_DAYS = 30;

export function windowStartIso(windowDays: number): string {
  const ms = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

/**
 * Subset van `ThemeRow` die door `fetchWindowAggregation` wordt opgehaald.
 * TH-009: sinds de BASIC-kolomsplitsing bevat de DB-response voor pills +
 * donut alleen deze velden. Een volledige `ThemeRow` casten zou liegen
 * over welke kolommen er werkelijk in zitten.
 */
export interface ThemeBasicRow {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  mention_count: number;
  last_mentioned_at: string | null;
}

/**
 * Samengestelde aggregatie: alle verified themes met ≥1 match-history +
 * per-theme counts en laatste-match-timestamps binnen het window. Shared
 * tussen dashboard pills en donut zodat beiden met één preload toekunnen
 * (TH-008 / FIX-TH-804).
 */
export interface WindowAggregation {
  themes: ThemeBasicRow[];
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

  // TH-009: use THEME_COLUMNS_BASIC — pills + donut hebben alleen de 6
  // displaybare velden nodig, geen description/matching_guide/audit-fields.
  const [themesRes, linksRes] = await Promise.all([
    db.from("themes").select(THEME_COLUMNS_BASIC).eq("status", "verified").gt("mention_count", 0),
    db.from("meeting_themes").select("theme_id, created_at").gte("created_at", since),
  ]);

  if (themesRes.error) throw new Error(`themes fetch failed: ${themesRes.error.message}`);
  if (linksRes.error)
    throw new Error(`meeting_themes aggregation failed: ${linksRes.error.message}`);

  const themes = (themesRes.data ?? []) as ThemeBasicRow[];
  const counts = new Map<string, number>();
  const lastSeen = new Map<string, string>();

  for (const row of (linksRes.data ?? []) as Array<{ theme_id: string; created_at: string }>) {
    counts.set(row.theme_id, (counts.get(row.theme_id) ?? 0) + 1);
    const prev = lastSeen.get(row.theme_id);
    if (!prev || prev < row.created_at) lastSeen.set(row.theme_id, row.created_at);
  }

  return { themes, counts, lastSeen, windowDays };
}
