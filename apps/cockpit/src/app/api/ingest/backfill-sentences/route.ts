import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchFirefliesTranscript } from "@repo/ai/fireflies";
import { getAdminClient } from "@repo/database/supabase/admin";

const backfillSchema = z.object({
  meetingId: z.string().uuid(),
});

/**
 * Backfill sentences from Fireflies for an existing meeting.
 * Fetches the original transcript from Fireflies using the stored fireflies_id,
 * then stores the sentences array in raw_fireflies.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = backfillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const db = getAdminClient();

  // Get meeting with its fireflies_id and current raw_fireflies
  const { data: meeting, error: fetchError } = await db
    .from("meetings")
    .select("id, fireflies_id, raw_fireflies")
    .eq("id", parsed.data.meetingId)
    .single();

  if (fetchError || !meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  if (!meeting.fireflies_id) {
    return NextResponse.json({ error: "No fireflies_id on this meeting" }, { status: 400 });
  }

  // Fetch transcript from Fireflies
  const transcript = await fetchFirefliesTranscript(meeting.fireflies_id);
  if (!transcript) {
    return NextResponse.json({ error: "Failed to fetch from Fireflies" }, { status: 502 });
  }

  // Merge sentences into existing raw_fireflies
  const updatedRawFireflies = {
    ...((meeting.raw_fireflies as Record<string, unknown>) ?? {}),
    sentences: transcript.sentences,
  };

  const { error: updateError } = await db
    .from("meetings")
    .update({ raw_fireflies: updatedRawFireflies })
    .eq("id", meeting.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    meetingId: meeting.id,
    sentencesCount: transcript.sentences.length,
  });
}
