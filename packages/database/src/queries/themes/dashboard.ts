import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_WINDOW_DAYS, fetchWindowAggregation, type WindowAggregation } from "./internals";

/**
 * TH-008 — dashboard-queries (pills + donut). Beide functies accepteren een
 * optioneel `preloaded`-veld zodat de page-component één keer kan ophalen
 * en delen, i.p.v. per Suspense-child een eigen round-trip te doen (zie
 * FIX-TH-804).
 */

export { fetchWindowAggregation };
export type { WindowAggregation };

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

/**
 * Top-N verified themes binnen het window, gesorteerd op mentions desc. Tie-
 * breaker: `last_mentioned_at` desc zodat recent-actief voorrang krijgt op
 * oud-vaak. Themes met 0 mentions in het window vallen af. Lege array als
 * er nog geen matches zijn — caller toont empty-state.
 */
export async function listTopActiveThemes(
  options?: { limit?: number; windowDays?: number; preloaded?: WindowAggregation },
  client?: SupabaseClient,
): Promise<TopActiveTheme[]> {
  const limit = options?.limit ?? 8;
  const windowDays = options?.windowDays ?? DEFAULT_WINDOW_DAYS;
  const { themes, counts, lastSeen } =
    options?.preloaded ?? (await fetchWindowAggregation(windowDays, client));

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
  options?: { windowDays?: number; preloaded?: WindowAggregation },
  client?: SupabaseClient,
): Promise<ThemeShareDistribution> {
  const windowDays = options?.windowDays ?? DEFAULT_WINDOW_DAYS;
  const { themes, counts, lastSeen } =
    options?.preloaded ?? (await fetchWindowAggregation(windowDays, client));

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
