import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

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

export interface EmailForPipelineInput {
  id: string;
  subject: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  date: string;
  body_text: string | null;
  snippet: string | null;
}

/**
 * Slanke read van de velden die `processEmail()` als input verwacht. Gebruikt
 * door `unfilterEmailAction` en de bulk-reclassify route. Geen joins, geen
 * extractions — alleen de ruwe email-velden.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getEmailForPipelineInput(
  emailId: string,
  client?: SupabaseClient,
): Promise<EmailForPipelineInput | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("emails")
    .select("id, subject, from_address, from_name, to_addresses, date, body_text, snippet")
    .eq("id", emailId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id as string,
    subject: data.subject as string | null,
    from_address: data.from_address as string,
    from_name: data.from_name as string | null,
    to_addresses: (data.to_addresses as string[] | null) ?? [],
    date: data.date as string,
    body_text: data.body_text as string | null,
    snippet: data.snippet as string | null,
  };
}

/**
 * Lijst ruwe email-velden voor de bulk-reclassify route. Ordent op datum desc
 * en respecteert een limit (hard cap wordt door de caller toegepast).
 *
 * Wanneer `skipFiltered=true` worden al-gefilterde emails overgeslagen
 * (alleen unprocessed OF kept-emails). Default: true.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function listEmailsForReclassify(options: {
  limit: number;
  skipFiltered?: boolean;
  client?: SupabaseClient;
}): Promise<EmailForPipelineInput[]> {
  const db = options.client ?? getAdminClient();
  let query = db
    .from("emails")
    .select("id, subject, from_address, from_name, to_addresses, date, body_text, snippet")
    .order("date", { ascending: false })
    .limit(options.limit);

  if (options.skipFiltered ?? true) {
    query = query.or("filter_status.eq.kept,is_processed.eq.false");
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    subject: row.subject as string | null,
    from_address: row.from_address as string,
    from_name: row.from_name as string | null,
    to_addresses: (row.to_addresses as string[] | null) ?? [],
    date: row.date as string,
    body_text: row.body_text as string | null,
    snippet: row.snippet as string | null,
  }));
}

/**
 * List the linked `project_id`s of an email (uit `email_projects`). Mirror
 * van `listMeetingProjectIds`. Gebruikt door de summary-pipeline trigger.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function listEmailProjectIds(
  emailId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("email_projects")
    .select("project_id")
    .eq("email_id", emailId);

  if (error) {
    console.error("[listEmailProjectIds]", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.project_id as string);
}

/**
 * Mini-query: 1 kolom (`organization_id`) van een email. Mirror van
 * `getMeetingOrganizationId`. Gebruikt door de summary-pipeline trigger.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getEmailOrganizationId(
  emailId: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("emails")
    .select("organization_id")
    .eq("id", emailId)
    .maybeSingle();

  if (error) {
    console.error("[getEmailOrganizationId]", error.message);
    return null;
  }
  return (data?.organization_id as string | null) ?? null;
}

export interface VerifiedEmailForSummary {
  subject: string | null;
  date: string;
  from_name: string | null;
  from_address: string;
  snippet: string | null;
}

/**
 * List verified-and-kept emails by id, ordered by date desc. Used by the
 * project summary pipeline om filter_status=kept emails op te halen voor
 * het briefing-prompt. Filtert filtered/spam-emails uit de selectie.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function listVerifiedEmailsForSummary(
  emailIds: string[],
  client?: SupabaseClient,
): Promise<VerifiedEmailForSummary[]> {
  if (emailIds.length === 0) return [];
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("emails")
    .select("subject, date, from_name, from_address, snippet")
    .in("id", emailIds)
    .eq("verification_status", "verified")
    .eq("filter_status", "kept")
    .order("date", { ascending: false });

  if (error) {
    console.error("[listVerifiedEmailsForSummary]", error.message);
    return [];
  }
  return (data ?? []) as VerifiedEmailForSummary[];
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
