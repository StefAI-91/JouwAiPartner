import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface MeetingThemeMatch {
  themeId: string;
  confidence: "medium" | "high";
  evidenceQuote: string;
}

export interface EmergingThemeProposal {
  name: string;
  description: string;
  matching_guide: string;
  emoji: string;
  created_by_agent?: string;
}

/**
 * Insert meeting-theme matches. Upsert op composite PK (meeting_id, theme_id):
 * re-tag van dezelfde meeting overschrijft de eerdere matches voor hetzelfde
 * thema zonder duplicate-error. Returns geïnserteerde/geüpdate count.
 */
export async function linkMeetingToThemes(
  meetingId: string,
  matches: MeetingThemeMatch[],
  client?: SupabaseClient,
): Promise<{ success: true; count: number } | { error: string }> {
  if (matches.length === 0) return { success: true, count: 0 };
  const db = client ?? getAdminClient();

  const rows = matches.map((m) => ({
    meeting_id: meetingId,
    theme_id: m.themeId,
    confidence: m.confidence,
    evidence_quote: m.evidenceQuote,
  }));

  const { error, count } = await db
    .from("meeting_themes")
    .upsert(rows, { onConflict: "meeting_id,theme_id", count: "exact" });

  if (error) return { error: error.message };
  return { success: true, count: count ?? rows.length };
}

/**
 * Verwijder alle theme-matches voor een meeting. Nodig voor re-tag via
 * TH-006 regenerate-knop en voor batch --force. Matching_guide-wijzigingen
 * triggeren geen auto-retag (zou cascading cost geven).
 */
export async function clearMeetingThemes(
  meetingId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("meeting_themes").delete().eq("meeting_id", meetingId);
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Maak een nieuw `emerging` thema aan. De slug wordt afgeleid van `name`
 * (kebab-case); bij UNIQUE-collision geeft PG een duidelijke fout terug die
 * de caller logt. Niet silent renamen — emerging themes horen menselijk
 * beoordeeld te worden in de review-flow (TH-006).
 */
export async function createEmergingTheme(
  proposal: EmergingThemeProposal,
  client?: SupabaseClient,
): Promise<{ success: true; id: string; slug: string } | { error: string }> {
  const db = client ?? getAdminClient();
  const slug = slugify(proposal.name);

  const { data, error } = await db
    .from("themes")
    .insert({
      slug,
      name: proposal.name,
      description: proposal.description,
      matching_guide: proposal.matching_guide,
      emoji: proposal.emoji,
      status: "emerging",
      created_by_agent: proposal.created_by_agent ?? "theme_tagger",
    })
    .select("id, slug")
    .single();

  if (error) return { error: error.message };
  return { success: true, id: data.id, slug: data.slug };
}

/**
 * Herbereken `mention_count` en `last_mentioned_at` op de gegeven themes uit
 * de junction-tabel. Eén RPC-call naar `recalculate_theme_stats(uuid[])` —
 * constant aantal round-trips ongeacht N. Zonder deze sync raken pills en
 * donut out of sync met de werkelijkheid.
 */
export async function recalculateThemeStats(
  themeIds: string[],
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  if (themeIds.length === 0) return { success: true };
  const db = client ?? getAdminClient();

  const { error } = await db.rpc("recalculate_theme_stats", { theme_ids: themeIds });
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Alias van `clearMeetingThemes` met TH-006-semantiek: expliciet naamgegeven
 * zodat de regenerate-flow in `regenerateMeetingThemesAction` leesbaar blijft.
 * Bewaart `theme_match_rejections` (die horen bij feedback-loop, niet bij de
 * matches) en alleen `meeting_themes` wordt geleegd.
 */
export async function deleteMatchesForMeeting(
  meetingId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  return clearMeetingThemes(meetingId, client);
}

/**
 * TH-006 — reject één theme-match vanuit de review-UI. Atomisch: verwijder
 * `meeting_themes` row + insert `theme_match_rejections` met reden + reviewer
 * id. Idempotent (EDGE-211): als de match al weg is retourneren we success
 * zonder rejection-insert te schrijven, anders zou dubbel-klikken twee rows
 * opleveren.
 *
 * @security TH-007 — de caller MOET `requireAdminInAction()` of
 *           `isAdmin(userId)` hebben uitgevoerd vóór deze functie wordt
 *           aangeroepen. De mutation zelf doet géén auth-check; `userId`
 *           wordt blind weggeschreven naar `theme_match_rejections.rejected_by`.
 *           Aanroepen vanuit niet-gegarde code-paden is een security-bug
 *           (spoofing van reviewer-identiteit). De naam `…AsAdmin` maakt
 *           deze verantwoordelijkheid expliciet zichtbaar bij iedere
 *           call-site; PR-reviewers moeten hierop letten.
 */
export async function rejectThemeMatchAsAdmin(
  input: {
    meetingId: string;
    themeId: string;
    reason: "niet_substantieel" | "ander_thema" | "te_breed";
    userId: string;
  },
  client?: SupabaseClient,
): Promise<{ success: true; alreadyRemoved: boolean } | { error: string }> {
  const db = client ?? getAdminClient();

  // Lees de huidige match — we hebben de evidence_quote nodig voor de
  // rejection-row (die voedt negative_examples in de volgende prompt).
  const { data: match, error: readErr } = await db
    .from("meeting_themes")
    .select("evidence_quote")
    .eq("meeting_id", input.meetingId)
    .eq("theme_id", input.themeId)
    .maybeSingle();

  if (readErr) return { error: readErr.message };

  // EDGE-211: match bestaat niet meer (dubbel-klik, race). Succes zonder
  // nieuwe rejection — die zou geen bewijs meer hebben en kan dupliceren.
  if (!match) return { success: true, alreadyRemoved: true };

  const { error: delErr } = await db
    .from("meeting_themes")
    .delete()
    .eq("meeting_id", input.meetingId)
    .eq("theme_id", input.themeId);
  if (delErr) return { error: delErr.message };

  const { error: insErr } = await db.from("theme_match_rejections").insert({
    theme_id: input.themeId,
    meeting_id: input.meetingId,
    evidence_quote: match.evidence_quote,
    reason: input.reason,
    rejected_by: input.userId,
  });
  if (insErr) return { error: insErr.message };

  return { success: true, alreadyRemoved: false };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // strip combining diacritics via Unicode mark property
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
