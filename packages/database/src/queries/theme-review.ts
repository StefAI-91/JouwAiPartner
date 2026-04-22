import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import type { ThemeRow } from "./themes";
import { THEME_COLUMNS } from "./theme-internals";

/**
 * TH-006 — review-flow queries. Gesplitst uit `queries/themes.ts` in TH-008.
 */

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
 * Haalt alle `status='emerging'` themes op met per theme de 2-3 meetings die
 * hem triggerden (UI-292: "Gevonden in:"). Proposal-origin wordt via
 * `meeting_themes` geregistreerd in de tag-themes pipeline step, dus we
 * hergebruiken die join.
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
