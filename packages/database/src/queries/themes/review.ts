import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import type { ThemeRow } from "./core";
import { THEME_COLUMNS } from "./internals";

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

/**
 * TH-011 (FUNC-274) — Set van `theme_id`-strings die voor deze `meetingId`
 * gerejected zijn. `link-themes.ts` filtert matches op dit Set voordat hij
 * meeting_themes insert, zodat admin-rejections niet door een fresh pipeline-
 * run worden teruggezet. Geen nieuwe tabel of kolom — gewoon de bestaande
 * `theme_match_rejections` gegroepeerd per meeting.
 */
export async function listRejectedThemePairsForMeeting(
  meetingId: string,
  client?: SupabaseClient,
): Promise<Set<string>> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("theme_match_rejections")
    .select("theme_id")
    .eq("meeting_id", meetingId);

  if (error) throw new Error(`rejected theme pairs fetch failed: ${error.message}`);
  return new Set((data ?? []).map((r) => r.theme_id));
}

/**
 * TH-011 (UI-330) — themes met `status='emerging'` waarvan de origin-meeting
 * `meetingId` is. Voedt het "Voorgestelde thema's" tabblad in de
 * meeting-review. Eerst via `origin_meeting_id` (TH-011+), dan een fallback
 * via `meeting_themes` voor pre-TH-011 proposals (TH-010 zette `origin` niet
 * op themes zelf — alleen meeting_themes-link kan herleid worden).
 *
 * Pre-TH-011 fallback is bewust soft: oude emerging-proposals blijven via
 * de bulk-sectie (`listEmergingThemes`) op `/review` zichtbaar.
 */
export async function listProposedThemesForMeeting(
  meetingId: string,
  client?: SupabaseClient,
): Promise<ThemeRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("themes")
    .select(THEME_COLUMNS)
    .eq("status", "emerging")
    .eq("origin_meeting_id", meetingId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`proposed themes fetch failed: ${error.message}`);
  return (data ?? []) as ThemeRow[];
}
