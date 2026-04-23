import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

/**
 * TH-011 — Queries voor de `/dev/detector` harness. Lezen-alleen: de huidige
 * DB-state voor een meeting zodat de UI een diff kan tonen met verse
 * Theme-Detector output. Geen mutaties; de harness schrijft nooit terug.
 */

export interface DevDetectorMeetingThemeRow {
  theme_id: string;
  theme_name: string;
  theme_emoji: string;
  confidence: "medium" | "high";
  evidence_quote: string;
  summary: string | null;
  created_at: string;
}

export interface DevDetectorExtractionThemeRow {
  extraction_id: string;
  theme_id: string;
  confidence: "medium" | "high";
  extraction_type: string;
  extraction_content: string;
}

export async function getMeetingThemesForDevDetector(
  meetingId: string,
  client?: SupabaseClient,
): Promise<DevDetectorMeetingThemeRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meeting_themes")
    .select(
      "theme_id, confidence, evidence_quote, summary, created_at, theme:theme_id (name, emoji)",
    )
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`dev-detector meeting-themes failed: ${error.message}`);

  type Row = {
    theme_id: string;
    confidence: "medium" | "high";
    evidence_quote: string;
    summary: string | null;
    created_at: string;
    theme: { name: string; emoji: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    theme_id: r.theme_id,
    theme_name: r.theme?.name ?? "(onbekend thema)",
    theme_emoji: r.theme?.emoji ?? "🏷️",
    confidence: r.confidence,
    evidence_quote: r.evidence_quote,
    summary: r.summary,
    created_at: r.created_at,
  }));
}

export async function getExtractionThemesForDevDetector(
  meetingId: string,
  client?: SupabaseClient,
): Promise<DevDetectorExtractionThemeRow[]> {
  const db = client ?? getAdminClient();

  const { data: extractions, error: exErr } = await db
    .from("extractions")
    .select("id, type, content")
    .eq("meeting_id", meetingId);
  if (exErr) throw new Error(`dev-detector extractions failed: ${exErr.message}`);

  const ids = (extractions ?? []).map((e) => e.id);
  if (ids.length === 0) return [];

  const { data, error } = await db
    .from("extraction_themes")
    .select("extraction_id, theme_id, confidence")
    .in("extraction_id", ids);
  if (error) throw new Error(`dev-detector extraction-themes failed: ${error.message}`);

  const extractionById = new Map(
    (extractions ?? []).map((e) => [e.id, { type: e.type, content: e.content }]),
  );

  type Row = { extraction_id: string; theme_id: string; confidence: "medium" | "high" };
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const ex = extractionById.get(r.extraction_id);
    return {
      extraction_id: r.extraction_id,
      theme_id: r.theme_id,
      confidence: r.confidence,
      extraction_type: ex?.type ?? "",
      extraction_content: ex?.content ?? "",
    };
  });
}
