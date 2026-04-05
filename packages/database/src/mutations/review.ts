import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

/**
 * Verify a meeting and all its extractions atomically via RPC.
 * Optionally applies edits to individual extractions before verifying.
 */
export async function verifyMeeting(
  meetingId: string,
  userId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();

  const { error } = await db.rpc("verify_meeting", {
    p_meeting_id: meetingId,
    p_user_id: userId,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function verifyMeetingWithEdits(
  meetingId: string,
  userId: string,
  edits: { extractionId: string; content?: string; metadata?: Record<string, unknown> }[],
  rejectedIds: string[] = [],
  typeChanges: { extractionId: string; type: string }[] = [],
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();

  const editsJson = edits.map((e) => ({
    extractionId: e.extractionId,
    content: e.content ?? null,
    metadata: e.metadata ?? null,
  }));

  const typeChangesJson = typeChanges.map((tc) => ({
    extractionId: tc.extractionId,
    type: tc.type,
  }));

  const { error } = await db.rpc("verify_meeting", {
    p_meeting_id: meetingId,
    p_user_id: userId,
    p_edits: editsJson,
    p_rejected_ids: rejectedIds,
    p_type_changes: typeChangesJson,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function rejectMeeting(
  meetingId: string,
  userId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();

  const { error } = await db.rpc("reject_meeting", {
    p_meeting_id: meetingId,
    p_user_id: userId,
  });

  if (error) return { error: error.message };
  return { success: true };
}
