import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = getAdminClient();

  // Check meetings
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, embedding_stale, raw_fireflies, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const meetingStatus = await Promise.all(
    (meetings ?? []).map(async (m) => {
      // Check if embedding exists (can't select vector directly, check stale flag)
      const { data: embCheck } = await supabase
        .from("meetings")
        .select("embedding_stale")
        .eq("id", m.id)
        .not("embedding", "is", null)
        .single();

      // Count extractions for this meeting
      const { count } = await supabase
        .from("extractions")
        .select("id", { count: "exact", head: true })
        .eq("meeting_id", m.id);

      // Count extractions with embeddings
      const { count: embeddedExtractions } = await supabase
        .from("extractions")
        .select("id", { count: "exact", head: true })
        .eq("meeting_id", m.id)
        .not("embedding", "is", null);

      return {
        id: m.id,
        title: m.title,
        embedding_stale: m.embedding_stale,
        has_embedding: !!embCheck,
        has_raw_fireflies: !!m.raw_fireflies,
        raw_fireflies_keys: m.raw_fireflies
          ? Object.keys(m.raw_fireflies as Record<string, unknown>)
          : [],
        pipeline_data: m.raw_fireflies
          ? (m.raw_fireflies as Record<string, unknown>).pipeline
          : null,
        extractions_count: count ?? 0,
        extractions_with_embedding: embeddedExtractions ?? 0,
        created_at: m.created_at,
      };
    }),
  );

  // Check recent extractions
  const { data: extractions } = await supabase
    .from("extractions")
    .select("id, meeting_id, type, content, confidence, transcript_ref, embedding_stale")
    .order("created_at", { ascending: false })
    .limit(20);

  const extractionStatus = (extractions ?? []).map((e) => ({
    id: e.id,
    meeting_id: e.meeting_id,
    type: e.type,
    content: e.content?.substring(0, 100),
    confidence: e.confidence,
    has_transcript_ref: !!e.transcript_ref,
    embedding_stale: e.embedding_stale,
  }));

  return NextResponse.json({
    meetings: meetingStatus,
    extractions: extractionStatus,
    summary: {
      total_meetings: meetingStatus.length,
      meetings_with_embedding: meetingStatus.filter((m) => m.has_embedding).length,
      meetings_with_raw_fireflies: meetingStatus.filter((m) => m.has_raw_fireflies).length,
      total_extractions: extractionStatus.length,
      extractions_with_embedding: meetingStatus.reduce(
        (sum, m) => sum + m.extractions_with_embedding,
        0,
      ),
    },
  });
}
