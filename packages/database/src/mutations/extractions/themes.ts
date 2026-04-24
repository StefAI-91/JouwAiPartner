import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

export interface ExtractionThemeRow {
  extractionId: string;
  themeId: string;
  confidence: "medium" | "high";
}

/**
 * TH-010 — Link extractions aan een thema via de `extraction_themes` junction.
 * Upsert op composite PK `(extraction_id, theme_id)` zodat re-tag geen
 * duplicate-error geeft. EDGE-221: lege array returnt success zonder DB-call,
 * spiegeling van `linkMeetingToThemes`.
 */
export async function linkExtractionsToThemes(
  rows: ExtractionThemeRow[],
  client?: SupabaseClient,
): Promise<{ success: true; count: number } | { error: string }> {
  if (rows.length === 0) return { success: true, count: 0 };
  const db = client ?? getAdminClient();

  const payload = rows.map((r) => ({
    extraction_id: r.extractionId,
    theme_id: r.themeId,
    confidence: r.confidence,
  }));

  const { error, count } = await db
    .from("extraction_themes")
    .upsert(payload, { onConflict: "extraction_id,theme_id", count: "exact" });

  if (error) return { error: error.message };
  return { success: true, count: count ?? payload.length };
}

/**
 * Verwijder alle `extraction_themes`-rijen voor een meeting. Nodig voor de
 * regenerate-flow en batch --force: de pipeline-step clear't de junction
 * voordat de Tagger opnieuw linkt, anders stapelen stale rijen. Join via
 * `extractions.meeting_id` → eerst de extraction-ids voor deze meeting
 * ophalen, dan deleten op `extraction_id IN (...)`.
 */
export async function clearExtractionThemesForMeeting(
  meetingId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();

  const { data: extractions, error: readErr } = await db
    .from("extractions")
    .select("id")
    .eq("meeting_id", meetingId);
  if (readErr) return { error: readErr.message };

  const ids = (extractions ?? []).map((e) => e.id);
  if (ids.length === 0) return { success: true };

  const { error: delErr } = await db.from("extraction_themes").delete().in("extraction_id", ids);
  if (delErr) return { error: delErr.message };

  return { success: true };
}

/**
 * TH-010 — Reject-cascade: bij het verwijderen van één `meeting_themes`-rij
 * moeten ook alle `extraction_themes`-rijen voor (meeting_id, theme_id) weg.
 * Scoping: dezelfde meeting_id-join als `clearExtractionThemesForMeeting`,
 * maar extra gefilterd op `theme_id`.
 */
export async function clearExtractionThemesForThemeInMeeting(
  meetingId: string,
  themeId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();

  const { data: extractions, error: readErr } = await db
    .from("extractions")
    .select("id")
    .eq("meeting_id", meetingId);
  if (readErr) return { error: readErr.message };

  const ids = (extractions ?? []).map((e) => e.id);
  if (ids.length === 0) return { success: true };

  const { error: delErr } = await db
    .from("extraction_themes")
    .delete()
    .eq("theme_id", themeId)
    .in("extraction_id", ids);
  if (delErr) return { error: delErr.message };

  return { success: true };
}
