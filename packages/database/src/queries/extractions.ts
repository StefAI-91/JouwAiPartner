import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface ExtractionForHarness {
  id: string;
  content: string;
  confidence: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Fetch alle extractions voor één (meeting, type) — strikt type-gefilterd
 * zodat de /dev/extractor harness geen leakage van andere types krijgt.
 * Gesorteerd op created_at desc (meest recente run eerst).
 *
 * Leest alleen de kolommen die de A/B-panels nodig hebben (geen bloat
 * zoals transcript_ref, project_id, follow_up_context — die zijn niet
 * relevant voor de diff-view).
 */
export async function getExtractionsForMeetingByType(
  meetingId: string,
  type: string,
  client?: SupabaseClient,
): Promise<ExtractionForHarness[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("extractions")
    .select("id, content, confidence, metadata, created_at")
    .eq("meeting_id", meetingId)
    .eq("type", type)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getExtractionsForMeetingByType]", error.message);
    return [];
  }
  return (data ?? []) as ExtractionForHarness[];
}
