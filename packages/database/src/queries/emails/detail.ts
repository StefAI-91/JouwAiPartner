import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import type { EmailFilterStatus } from "./lists";

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
