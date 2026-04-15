import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

// --- Google Account types ---

/** Safe version for UI: no tokens exposed */
export interface GoogleAccountSafe {
  id: string;
  email: string;
  is_active: boolean;
  last_sync_at: string | null;
}

/** Full version with tokens: only for sync pipeline (server-side only) */
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

// --- Google Account queries (safe, for UI) ---

export async function listActiveGoogleAccountsSafe(
  client?: SupabaseClient,
): Promise<GoogleAccountSafe[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("google_accounts")
    .select("id, email, is_active, last_sync_at")
    .eq("is_active", true);

  if (error || !data) return [];
  return data;
}

// --- Google Account queries (with tokens, for sync pipeline only) ---

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

export type EmailDirection = "incoming" | "outgoing";
export type EmailFilterStatus = "kept" | "filtered";

export interface EmailListItem {
  id: string;
  gmail_id: string;
  subject: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  date: string;
  snippet: string | null;
  labels: string[];
  has_attachments: boolean;
  is_processed: boolean;
  verification_status: string;
  relevance_score: number | null;
  email_type: string | null;
  party_type: string | null;
  direction: EmailDirection;
  filter_status: EmailFilterStatus;
  filter_reason: string | null;
  organization: { id: string; name: string } | null;
  projects: { id: string; name: string }[];
}

export async function listEmails(options: {
  googleAccountId?: string;
  verificationStatus?: string;
  isProcessed?: boolean;
  direction?: EmailDirection;
  filterStatus?: EmailFilterStatus;
  organizationId?: string;
  limit?: number;
  offset?: number;
  client?: SupabaseClient;
}): Promise<{ items: EmailListItem[]; count: number }> {
  const db = options.client ?? getAdminClient();
  let query = db
    .from("emails")
    .select(
      `id, gmail_id, subject, from_address, from_name, to_addresses, date, snippet, labels,
       has_attachments, is_processed, verification_status, relevance_score,
       email_type, party_type, direction, filter_status, filter_reason,
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
  if (options.direction) {
    query = query.eq("direction", options.direction);
  }
  if (options.filterStatus) {
    query = query.eq("filter_status", options.filterStatus);
  }
  if (options.organizationId) {
    query = query.eq("organization_id", options.organizationId);
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
    to_addresses: (row.to_addresses as string[] | null) ?? [],
    date: row.date as string,
    snippet: row.snippet as string | null,
    labels: row.labels as string[],
    has_attachments: row.has_attachments as boolean,
    is_processed: row.is_processed as boolean,
    verification_status: row.verification_status as string,
    relevance_score: row.relevance_score as number | null,
    email_type: row.email_type as string | null,
    party_type: row.party_type as string | null,
    direction: (row.direction as EmailDirection) ?? "incoming",
    filter_status: (row.filter_status as EmailFilterStatus) ?? "kept",
    filter_reason: row.filter_reason as string | null,
    organization: row.organization as { id: string; name: string } | null,
    projects: ((row.projects as { project: { id: string; name: string } }[]) ?? []).map(
      (p) => p.project,
    ),
  }));

  return { items, count: count ?? 0 };
}

/**
 * Telt emails per filter_status voor een gegeven direction. Handig voor
 * de tab-switcher (Inbox vs Gefilterd) op de /emails pagina.
 */
export async function countEmailsByFilterStatus(options: {
  direction?: EmailDirection;
  client?: SupabaseClient;
}): Promise<{ kept: number; filtered: number }> {
  const db = options.client ?? getAdminClient();
  const buildQuery = (status: EmailFilterStatus) => {
    let q = db
      .from("emails")
      .select("id", { count: "exact", head: true })
      .eq("filter_status", status);
    if (options.direction) q = q.eq("direction", options.direction);
    return q;
  };
  const [kept, filtered] = await Promise.all([buildQuery("kept"), buildQuery("filtered")]);
  return {
    kept: kept.count ?? 0,
    filtered: filtered.count ?? 0,
  };
}

/**
 * Lijst alle e-mails voor één organisatie, gesorteerd op datum aflopend.
 *
 * Thin wrapper rond listEmails() met vaste organisatie-filter. Handig voor
 * de administratie-detailpagina die per adviseur de bijbehorende mails toont.
 * Zie sprint 034 / FUNC-037.
 */
export async function listEmailsByOrganization(
  orgId: string,
  options?: { limit?: number; offset?: number; client?: SupabaseClient },
): Promise<{ items: EmailListItem[]; count: number }> {
  return listEmails({
    organizationId: orgId,
    limit: options?.limit,
    offset: options?.offset,
    client: options?.client,
  });
}

export async function countEmailsByDirection(options: {
  client?: SupabaseClient;
}): Promise<{ incoming: number; outgoing: number }> {
  const db = options.client ?? getAdminClient();
  const [incoming, outgoing] = await Promise.all([
    db.from("emails").select("id", { count: "exact", head: true }).eq("direction", "incoming"),
    db.from("emails").select("id", { count: "exact", head: true }).eq("direction", "outgoing"),
  ]);
  return {
    incoming: incoming.count ?? 0,
    outgoing: outgoing.count ?? 0,
  };
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
  email_type: string | null;
  party_type: string | null;
  filter_status: EmailFilterStatus;
  filter_reason: string | null;
  sender_person_id: string | null;
  sender_person: { id: string; name: string; role: string | null } | null;
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

export async function getEmailById(
  emailId: string,
  client?: SupabaseClient,
): Promise<EmailDetail | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("emails")
    .select(
      `id, gmail_id, thread_id, subject, from_address, from_name, to_addresses, cc_addresses,
       date, body_text, snippet, labels, has_attachments, is_processed, verification_status,
       relevance_score, email_type, party_type, filter_status, filter_reason,
       sender_person_id, organization_id,
       sender_person:people!emails_sender_person_id_fkey(id, name, role),
       organization:organizations!emails_organization_id_fkey(id, name),
       projects:email_projects(project:projects(id, name), source),
       extractions:email_extractions(id, type, content, confidence, source_ref, project_id, verification_status, metadata)`,
    )
    .eq("id", emailId)
    .single();

  if (error || !data) return null;

  const senderPerson = data.sender_person as unknown as {
    id: string;
    name: string;
    role: string | null;
  } | null;
  const org = data.organization as unknown as { id: string; name: string } | null;
  const projects = (data.projects ?? []) as unknown as {
    project: { id: string; name: string };
    source: string;
  }[];
  const extractions = (data.extractions ?? []) as unknown as EmailDetail["extractions"];

  return {
    ...data,
    filter_status: ((data as { filter_status?: string }).filter_status ??
      "kept") as EmailFilterStatus,
    filter_reason: ((data as { filter_reason?: string | null }).filter_reason ?? null) as
      | string
      | null,
    sender_person: senderPerson,
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

export async function listDraftEmails(client?: SupabaseClient): Promise<ReviewEmail[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("emails")
    .select(
      `id, subject, from_address, from_name, date, snippet, created_at,
       organization:organizations!emails_organization_id_fkey(name),
       extractions:email_extractions(id, type, content, confidence)`,
    )
    .eq("verification_status", "draft")
    .eq("is_processed", true)
    .eq("filter_status", "kept")
    .order("date", { ascending: false });

  if (error) {
    console.error("[listDraftEmails]", error.message);
    return [];
  }
  return (data ?? []) as unknown as ReviewEmail[];
}

export async function getDraftEmailById(
  emailId: string,
  client?: SupabaseClient,
): Promise<EmailDetail | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("emails")
    .select(
      `id, gmail_id, thread_id, subject, from_address, from_name, to_addresses, cc_addresses,
       date, body_text, snippet, labels, has_attachments, is_processed, verification_status,
       relevance_score, email_type, party_type, filter_status, filter_reason,
       sender_person_id, organization_id,
       sender_person:people!emails_sender_person_id_fkey(id, name, role),
       organization:organizations!emails_organization_id_fkey(id, name),
       projects:email_projects(project:projects(id, name), source),
       extractions:email_extractions(id, type, content, confidence, source_ref, project_id, verification_status, metadata)`,
    )
    .eq("id", emailId)
    .eq("verification_status", "draft")
    .single();

  if (error || !data) return null;

  const senderPerson = data.sender_person as unknown as {
    id: string;
    name: string;
    role: string | null;
  } | null;
  const org = data.organization as unknown as { id: string; name: string } | null;
  const projects = (data.projects ?? []) as unknown as {
    project: { id: string; name: string };
    source: string;
  }[];
  const extractions = (data.extractions ?? []) as unknown as EmailDetail["extractions"];

  return {
    ...data,
    filter_status: ((data as { filter_status?: string }).filter_status ??
      "kept") as EmailFilterStatus,
    filter_reason: ((data as { filter_reason?: string | null }).filter_reason ?? null) as
      | string
      | null,
    sender_person: senderPerson,
    organization: org,
    projects: projects.map((p) => ({ ...p.project, source: p.source })),
    extractions,
  };
}

/**
 * Telt hoeveel emails nog niet door de AI-pipeline zijn gegaan (is_processed=false).
 * Gebruikt door de UI om een "Verwerk N nieuwe emails"-knop te tonen.
 */
export async function countUnprocessedEmails(client?: SupabaseClient): Promise<number> {
  const db = client ?? getAdminClient();
  const { count, error } = await db
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("is_processed", false);

  if (error) return 0;
  return count ?? 0;
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
