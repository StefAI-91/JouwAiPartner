import { getAdminClient } from "../supabase/admin";

export interface GoogleAccountRow {
  id: string;
  user_id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  scopes: string[];
  is_active: boolean;
  last_sync_at: string | null;
}

export async function listActiveGoogleAccounts(): Promise<GoogleAccountRow[]> {
  const { data, error } = await getAdminClient()
    .from("google_accounts")
    .select(
      "id, user_id, email, access_token, refresh_token, token_expiry, scopes, is_active, last_sync_at",
    )
    .eq("is_active", true);

  if (error || !data) return [];
  return data;
}

export async function getGoogleAccountById(id: string): Promise<GoogleAccountRow | null> {
  const { data, error } = await getAdminClient()
    .from("google_accounts")
    .select(
      "id, user_id, email, access_token, refresh_token, token_expiry, scopes, is_active, last_sync_at",
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getGoogleAccountByEmail(email: string): Promise<GoogleAccountRow | null> {
  const { data, error } = await getAdminClient()
    .from("google_accounts")
    .select(
      "id, user_id, email, access_token, refresh_token, token_expiry, scopes, is_active, last_sync_at",
    )
    .eq("email", email)
    .single();

  if (error || !data) return null;
  return data;
}

export interface EmailListItem {
  id: string;
  gmail_id: string;
  subject: string | null;
  from_address: string;
  from_name: string | null;
  date: string;
  snippet: string | null;
  labels: string[];
  has_attachments: boolean;
  is_processed: boolean;
  verification_status: string;
  relevance_score: number | null;
  organization: { id: string; name: string } | null;
  projects: { id: string; name: string }[];
}

export async function listEmails(options: {
  googleAccountId?: string;
  verificationStatus?: string;
  isProcessed?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ items: EmailListItem[]; count: number }> {
  let query = getAdminClient()
    .from("emails")
    .select(
      `id, gmail_id, subject, from_address, from_name, date, snippet, labels,
       has_attachments, is_processed, verification_status, relevance_score,
       organization:organizations!emails_organization_id_fkey(id, name),
       projects:email_projects(project:projects(id, name))`,
      { count: "exact" },
    )
    .order("date", { ascending: false });

  if (options.googleAccountId) {
    query = query.eq("google_account_id", options.googleAccountId);
  }
  if (options.verificationStatus) {
    query = query.eq("verification_status", options.verificationStatus);
  }
  if (options.isProcessed !== undefined) {
    query = query.eq("is_processed", options.isProcessed);
  }

  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error || !data) return { items: [], count: 0 };

  const items: EmailListItem[] = data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    gmail_id: row.gmail_id as string,
    subject: row.subject as string | null,
    from_address: row.from_address as string,
    from_name: row.from_name as string | null,
    date: row.date as string,
    snippet: row.snippet as string | null,
    labels: row.labels as string[],
    has_attachments: row.has_attachments as boolean,
    is_processed: row.is_processed as boolean,
    verification_status: row.verification_status as string,
    relevance_score: row.relevance_score as number | null,
    organization: row.organization as { id: string; name: string } | null,
    projects: ((row.projects as { project: { id: string; name: string } }[]) ?? []).map(
      (p) => p.project,
    ),
  }));

  return { items, count: count ?? 0 };
}

export interface EmailDetail {
  id: string;
  gmail_id: string;
  thread_id: string;
  subject: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  date: string;
  body_text: string | null;
  snippet: string | null;
  labels: string[];
  has_attachments: boolean;
  is_processed: boolean;
  verification_status: string;
  relevance_score: number | null;
  organization_id: string | null;
  organization: { id: string; name: string } | null;
  projects: { id: string; name: string; source: string }[];
  extractions: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    source_ref: string | null;
    project_id: string | null;
    verification_status: string;
    metadata: Record<string, unknown>;
  }[];
}

export async function getEmailById(emailId: string): Promise<EmailDetail | null> {
  const { data, error } = await getAdminClient()
    .from("emails")
    .select(
      `id, gmail_id, thread_id, subject, from_address, from_name, to_addresses, cc_addresses,
       date, body_text, snippet, labels, has_attachments, is_processed, verification_status,
       relevance_score, organization_id,
       organization:organizations!emails_organization_id_fkey(id, name),
       projects:email_projects(project:projects(id, name), source),
       extractions:email_extractions(id, type, content, confidence, source_ref, project_id, verification_status, metadata)`,
    )
    .eq("id", emailId)
    .single();

  if (error || !data) return null;

  const org = data.organization as unknown as { id: string; name: string } | null;
  const projects = (data.projects ?? []) as unknown as {
    project: { id: string; name: string };
    source: string;
  }[];
  const extractions = (data.extractions ?? []) as unknown as EmailDetail["extractions"];

  return {
    ...data,
    organization: org,
    projects: projects.map((p) => ({ ...p.project, source: p.source })),
    extractions,
  };
}

export async function getExistingGmailIds(
  googleAccountId: string,
  gmailIds: string[],
): Promise<Set<string>> {
  if (gmailIds.length === 0) return new Set();

  const { data, error } = await getAdminClient()
    .from("emails")
    .select("gmail_id")
    .eq("google_account_id", googleAccountId)
    .in("gmail_id", gmailIds);

  if (error || !data) return new Set();
  return new Set(data.map((d) => d.gmail_id));
}

export interface ReviewEmail {
  id: string;
  subject: string | null;
  from_address: string;
  from_name: string | null;
  date: string;
  snippet: string | null;
  created_at: string;
  organization: { name: string } | null;
  extractions: { id: string; type: string; content: string; confidence: number | null }[];
}

export async function listDraftEmails(): Promise<ReviewEmail[]> {
  const { data, error } = await getAdminClient()
    .from("emails")
    .select(
      `id, subject, from_address, from_name, date, snippet, created_at,
       organization:organizations!emails_organization_id_fkey(name),
       extractions:email_extractions(id, type, content, confidence)`,
    )
    .eq("verification_status", "draft")
    .eq("is_processed", true)
    .order("date", { ascending: false });

  if (error) {
    console.error("[listDraftEmails]", error.message);
    return [];
  }
  return (data ?? []) as unknown as ReviewEmail[];
}

export async function getDraftEmailById(emailId: string): Promise<EmailDetail | null> {
  const { data, error } = await getAdminClient()
    .from("emails")
    .select(
      `id, gmail_id, thread_id, subject, from_address, from_name, to_addresses, cc_addresses,
       date, body_text, snippet, labels, has_attachments, is_processed, verification_status,
       relevance_score, organization_id,
       organization:organizations!emails_organization_id_fkey(id, name),
       projects:email_projects(project:projects(id, name), source),
       extractions:email_extractions(id, type, content, confidence, source_ref, project_id, verification_status, metadata)`,
    )
    .eq("id", emailId)
    .eq("verification_status", "draft")
    .single();

  if (error || !data) return null;

  const org = data.organization as unknown as { id: string; name: string } | null;
  const projects = (data.projects ?? []) as unknown as {
    project: { id: string; name: string };
    source: string;
  }[];
  const extractions = (data.extractions ?? []) as unknown as EmailDetail["extractions"];

  return {
    ...data,
    organization: org,
    projects: projects.map((p) => ({ ...p.project, source: p.source })),
    extractions,
  };
}

export async function getUnprocessedEmails(limit: number = 20): Promise<
  {
    id: string;
    subject: string | null;
    from_address: string;
    from_name: string | null;
    to_addresses: string[];
    date: string;
    body_text: string | null;
    snippet: string | null;
    google_account_id: string;
  }[]
> {
  const { data, error } = await getAdminClient()
    .from("emails")
    .select(
      "id, subject, from_address, from_name, to_addresses, date, body_text, snippet, google_account_id",
    )
    .eq("is_processed", false)
    .order("date", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}
