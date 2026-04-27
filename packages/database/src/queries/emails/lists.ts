import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

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
