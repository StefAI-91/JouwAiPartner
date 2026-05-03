import { getAdminClient } from "../../supabase/admin";

/**
 * Review-gate RPC's voor email-extractions. Server-side functions in
 * Supabase (`verify_email`, `reject_email`) houden de status-transities
 * atomic samen met audit-trail.
 */

export async function verifyEmail(
  emailId: string,
  userId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().rpc("verify_email", {
    p_email_id: emailId,
    p_user_id: userId,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function verifyEmailWithEdits(
  emailId: string,
  userId: string,
  edits: { extractionId: string; content?: string; metadata?: Record<string, unknown> }[],
  rejectedIds: string[] = [],
  typeChanges: { extractionId: string; type: string }[] = [],
): Promise<{ success: true } | { error: string }> {
  const editsJson = edits.map((e) => ({
    extractionId: e.extractionId,
    content: e.content ?? null,
    metadata: e.metadata ?? null,
  }));

  const typeChangesJson = typeChanges.map((tc) => ({
    extractionId: tc.extractionId,
    type: tc.type,
  }));

  const { error } = await getAdminClient().rpc("verify_email", {
    p_email_id: emailId,
    p_user_id: userId,
    p_edits: editsJson,
    p_rejected_ids: rejectedIds,
    p_type_changes: typeChangesJson,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function rejectEmail(
  emailId: string,
  userId: string,
  reason?: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().rpc("reject_email", {
    p_email_id: emailId,
    p_user_id: userId,
    p_reason: reason ?? null,
  });

  if (error) return { error: error.message };
  return { success: true };
}
