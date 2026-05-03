import { getAdminClient } from "../../supabase/admin";

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
    direction: "incoming" | "outgoing";
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

/**
 * Set or clear the gatekeeper filter status. Used by the pre-save filter
 * logic in the email pipeline, and by the "alsnog doorlaten" actie op
 * de detailpagina (status='kept', reason=null).
 */
export async function updateEmailFilterStatus(
  emailId: string,
  data: {
    filter_status: "kept" | "filtered";
    filter_reason: string | null;
  },
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("emails")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", emailId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateEmailSenderPerson(
  emailId: string,
  senderPersonId: string | null,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("emails")
    .update({ sender_person_id: senderPersonId, updated_at: new Date().toISOString() })
    .eq("id", emailId);

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
