import { getAdminClient } from "../supabase/admin";

export async function upsertGoogleAccount(account: {
  user_id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  scopes: string[];
}): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const { data, error } = await getAdminClient()
    .from("google_accounts")
    .upsert(account, { onConflict: "email" })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updateGoogleAccountTokens(
  accountId: string,
  tokens: { access_token: string; token_expiry: string },
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("google_accounts")
    .update({ ...tokens, updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateGoogleAccountLastSync(
  accountId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("google_accounts")
    .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deactivateGoogleAccount(
  accountId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("google_accounts")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function insertEmails(
  rows: {
    google_account_id: string;
    gmail_id: string;
    thread_id: string;
    subject: string | null;
    from_address: string;
    from_name: string | null;
    to_addresses: string[];
    cc_addresses: string[];
    date: string;
    body_text: string | null;
    body_html: string | null;
    snippet: string | null;
    labels: string[];
    has_attachments: boolean;
    raw_gmail: Record<string, unknown>;
    embedding_stale: boolean;
    verification_status: string;
  }[],
): Promise<{ success: true; count: number; ids: string[] } | { error: string }> {
  if (rows.length === 0) return { success: true, count: 0, ids: [] };

  const { data, error } = await getAdminClient()
    .from("emails")
    .upsert(rows, { onConflict: "gmail_id,google_account_id", ignoreDuplicates: true })
    .select("id");

  if (error) return { error: error.message };
  return { success: true, count: data?.length ?? 0, ids: data?.map((d) => d.id) ?? [] };
}

export async function updateEmailClassification(
  emailId: string,
  data: {
    organization_id: string | null;
    unmatched_organization_name: string | null;
    relevance_score: number;
    is_processed: boolean;
    email_type?: string | null;
    party_type?: string | null;
  },
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("emails")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", emailId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function linkEmailProject(
  emailId: string,
  projectId: string,
  source: "ai" | "manual" | "review" = "ai",
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("email_projects")
    .upsert(
      { email_id: emailId, project_id: projectId, source },
      { onConflict: "email_id,project_id" },
    );

  if (error) return { error: error.message };
  return { success: true };
}

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

export async function updateEmailType(
  emailId: string,
  emailType: string | null,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("emails")
    .update({ email_type: emailType, updated_at: new Date().toISOString() })
    .eq("id", emailId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateEmailPartyType(
  emailId: string,
  partyType: string | null,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("emails")
    .update({ party_type: partyType, updated_at: new Date().toISOString() })
    .eq("id", emailId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateEmailOrganization(
  emailId: string,
  organizationId: string | null,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("emails")
    .update({
      organization_id: organizationId,
      unmatched_organization_name: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", emailId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function unlinkEmailProject(
  emailId: string,
  projectId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("email_projects")
    .delete()
    .eq("email_id", emailId)
    .eq("project_id", projectId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function insertEmailExtractions(
  rows: {
    email_id: string;
    type: string;
    content: string;
    confidence: number;
    source_ref: string | null;
    metadata: Record<string, unknown>;
    project_id: string | null;
    embedding_stale: boolean;
    verification_status: string;
  }[],
): Promise<{ success: true; count: number } | { error: string }> {
  if (rows.length === 0) return { success: true, count: 0 };

  const { error } = await getAdminClient().from("email_extractions").insert(rows);

  if (error) return { error: error.message };
  return { success: true, count: rows.length };
}
