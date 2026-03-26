import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  fetchFirefliesTranscript,
  chunkTranscript,
} from "@/lib/fireflies";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const payload = await req.json();
  const { meetingId, eventType } = payload;

  // Only process completed transcriptions
  if (eventType !== "Transcription completed" || !meetingId) {
    return NextResponse.json({ skipped: true });
  }

  // Idempotency — skip if already ingested
  const { data: existing } = await supabase
    .from("meetings")
    .select("id")
    .eq("fireflies_id", meetingId)
    .single();

  if (existing) {
    return NextResponse.json({ skipped: true, reason: "duplicate" });
  }

  // Fetch full transcript from Fireflies
  const transcript = await fetchFirefliesTranscript(meetingId);

  if (!transcript) {
    return NextResponse.json(
      { error: "Failed to fetch transcript" },
      { status: 502 },
    );
  }

  // Chunk the transcript for storage
  const chunks = chunkTranscript(transcript.sentences);

  // Insert meeting record — re-embedding worker picks up stale rows
  const { error } = await supabase.from("meetings").insert({
    fireflies_id: meetingId,
    title: transcript.title,
    date: transcript.date,
    participants: transcript.participants,
    summary: transcript.summary?.overview ?? "",
    action_items: transcript.summary?.action_items ?? [],
    transcript: chunks.map((c) => c.text).join("\n\n---\n\n"),
    embedding_stale: true,
    status: "active",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, meetingId });
}
