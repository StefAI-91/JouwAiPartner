import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import { getLatestSummary } from "../summaries";

export interface ProjectDetail {
  id: string;
  name: string;
  status: string;
  description: string | null;
  github_url: string | null;
  preview_url: string | null;
  production_url: string | null;
  screenshot_url: string | null;
  organization_id: string | null;
  organization: { name: string } | null;
  owner: { id: string; name: string } | null;
  contact_person: { id: string; name: string } | null;
  start_date: string | null;
  deadline: string | null;
  meetings: {
    id: string;
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    verification_status: string;
  }[];
  emails: {
    id: string;
    subject: string | null;
    from_name: string | null;
    from_address: string;
    date: string;
    snippet: string | null;
    email_type: string | null;
    party_type: string | null;
    verification_status: string;
  }[];
  extractions: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    transcript_ref: string | null;
    metadata: Record<string, unknown>;
    meeting: { id: string; title: string | null } | null;
  }[];
  email_extractions: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    source_ref: string | null;
    metadata: Record<string, unknown>;
    email: { id: string; subject: string | null } | null;
  }[];
  context_summary: { content: string; version: number; created_at: string } | null;
  briefing_summary: {
    content: string;
    version: number;
    created_at: string;
    structured_content: Record<string, unknown> | null;
  } | null;
}

export async function getProjectById(
  projectId: string,
  client?: SupabaseClient,
): Promise<ProjectDetail | null> {
  const db = client ?? getAdminClient();

  const { data: project, error } = await db
    .from("projects")
    .select(
      `id, name, status, description, github_url, preview_url, production_url, screenshot_url,
       organization_id, start_date, deadline,
       organization:organizations(name),
       owner:people!projects_owner_id_fkey(id, name),
       contact_person:people!projects_contact_person_id_fkey(id, name)`,
    )
    .eq("id", projectId)
    .single();

  if (error) {
    console.error("[getProjectById]", error.message);
    return null;
  }

  // Run independent queries in parallel
  const [
    meetingLinksResult,
    emailLinksResult,
    extractionsResult,
    emailExtractionsResult,
    contextSummary,
    briefingSummary,
  ] = await Promise.all([
    db
      .from("meeting_projects")
      .select("meeting:meetings(id, title, date, meeting_type, verification_status)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    db
      .from("email_projects")
      .select(
        "email:emails(id, subject, from_name, from_address, date, snippet, email_type, party_type, verification_status)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    db
      .from("extractions")
      .select(
        `id, type, content, confidence, transcript_ref, metadata,
         meeting:meetings(id, title)`,
      )
      .eq("project_id", projectId)
      .eq("verification_status", "verified")
      .order("created_at", { ascending: false }),
    db
      .from("email_extractions")
      .select(
        `id, type, content, confidence, source_ref, metadata,
         email:emails(id, subject)`,
      )
      .eq("project_id", projectId)
      .eq("verification_status", "verified")
      .order("created_at", { ascending: false }),
    getLatestSummary("project", projectId, "context", db),
    getLatestSummary("project", projectId, "briefing", db),
  ]);

  const meetings = (meetingLinksResult.data ?? [])
    .map((link) => link.meeting as unknown as ProjectDetail["meetings"][number])
    .filter(Boolean)
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

  const emails = (emailLinksResult.data ?? [])
    .map((link) => link.email as unknown as ProjectDetail["emails"][number])
    .filter(Boolean)
    .sort((a: ProjectDetail["emails"][number], b: ProjectDetail["emails"][number]) =>
      b.date.localeCompare(a.date),
    );

  const typedProject = project as unknown as {
    id: string;
    name: string;
    status: string;
    description: string | null;
    github_url: string | null;
    preview_url: string | null;
    production_url: string | null;
    screenshot_url: string | null;
    organization_id: string | null;
    start_date: string | null;
    deadline: string | null;
    organization: { name: string } | null;
    owner: { id: string; name: string } | null;
    contact_person: { id: string; name: string } | null;
  };

  return {
    id: typedProject.id,
    name: typedProject.name,
    status: typedProject.status,
    description: typedProject.description,
    github_url: typedProject.github_url,
    preview_url: typedProject.preview_url,
    production_url: typedProject.production_url,
    screenshot_url: typedProject.screenshot_url,
    organization_id: typedProject.organization_id,
    start_date: typedProject.start_date,
    deadline: typedProject.deadline,
    organization: typedProject.organization,
    owner: typedProject.owner,
    contact_person: typedProject.contact_person,
    meetings,
    emails,
    extractions: (extractionsResult.data ?? []) as unknown as ProjectDetail["extractions"],
    email_extractions: (emailExtractionsResult.data ??
      []) as unknown as ProjectDetail["email_extractions"],
    context_summary: contextSummary
      ? {
          content: contextSummary.content,
          version: contextSummary.version,
          created_at: contextSummary.created_at,
        }
      : null,
    briefing_summary: briefingSummary
      ? {
          content: briefingSummary.content,
          version: briefingSummary.version,
          created_at: briefingSummary.created_at,
          structured_content: briefingSummary.structured_content,
        }
      : null,
  };
}
