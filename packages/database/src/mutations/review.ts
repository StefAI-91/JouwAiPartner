import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

// Accepted risk (v2): meeting + extractions update is non-atomic (two separate calls).
// With 3 internal reviewers and low concurrency this is safe. Migrate to a Supabase
// RPC with a single transaction if extraction counts or reviewer count grows.
export async function verifyMeeting(
  meetingId: string,
  userId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const now = new Date().toISOString();

  const { error: meetingError } = await db
    .from("meetings")
    .update({ verification_status: "verified", verified_by: userId, verified_at: now })
    .eq("id", meetingId)
    .eq("verification_status", "draft");

  if (meetingError) return { error: meetingError.message };

  const { error: extractionError } = await db
    .from("extractions")
    .update({ verification_status: "verified", verified_by: userId, verified_at: now })
    .eq("meeting_id", meetingId)
    .eq("verification_status", "draft");

  if (extractionError) return { error: extractionError.message };

  return { success: true };
}

export async function verifyMeetingWithEdits(
  meetingId: string,
  userId: string,
  edits: { extractionId: string; content?: string; metadata?: Record<string, unknown> }[],
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const now = new Date().toISOString();

  // Apply edits to individual extractions
  for (const edit of edits) {
    const updateData: Record<string, unknown> = {};
    if (edit.content !== undefined) updateData.content = edit.content;
    if (edit.metadata !== undefined) updateData.metadata = edit.metadata;

    if (Object.keys(updateData).length > 0) {
      const { error } = await db
        .from("extractions")
        .update(updateData)
        .eq("id", edit.extractionId)
        .eq("meeting_id", meetingId);

      if (error) return { error: error.message };
    }
  }

  // Then verify everything
  return verifyMeeting(meetingId, userId, db);
}

export async function rejectMeeting(
  meetingId: string,
  userId: string,
  reason: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const now = new Date().toISOString();

  const { error: meetingError } = await db
    .from("meetings")
    .update({
      verification_status: "rejected",
      verified_by: userId,
      verified_at: now,
    })
    .eq("id", meetingId)
    .eq("verification_status", "draft");

  if (meetingError) return { error: meetingError.message };

  const { error: extractionError } = await db
    .from("extractions")
    .update({
      verification_status: "rejected",
      verified_by: userId,
      verified_at: now,
    })
    .eq("meeting_id", meetingId)
    .eq("verification_status", "draft");

  if (extractionError) return { error: extractionError.message };

  return { success: true };
}
