import { getAdminClient } from "@repo/database/supabase/admin";
import { getLatestSummary } from "@repo/database/queries/summaries";
import { createSummaryVersion } from "@repo/database/mutations/summaries";
import { runProjectSummarizer, runOrgSummarizer } from "../agents/project-summarizer";

interface MeetingLink {
  meeting_id: string;
}

/**
 * Generate or update project summaries (context + briefing) based on
 * all verified extractions linked to the project.
 * Called after a meeting is verified that is linked to this project.
 */
export async function generateProjectSummaries(
  projectId: string,
  meetingIds: string[] = [],
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminClient();

    // Get project name
    const { data: project } = await db
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();

    if (!project) return { success: false, error: "Project not found" };

    // Get all verified extractions for this project
    const { data: extractions } = await db
      .from("extractions")
      .select("type, content, meeting:meetings(title, date)")
      .eq("project_id", projectId)
      .eq("verification_status", "verified");

    if (!extractions || extractions.length === 0) {
      return { success: true }; // nothing to summarize yet
    }

    const formattedExtractions = extractions.map((e) => {
      const meeting = e.meeting as unknown as { title: string | null; date: string | null } | null;
      return {
        type: e.type,
        content: e.content,
        meetingTitle: meeting?.title ?? null,
        meetingDate: meeting?.date ?? null,
      };
    });

    // Get existing context summary to provide as reference
    const existingContext = await getLatestSummary("project", projectId, "context", db);

    // Generate both summaries
    const output = await runProjectSummarizer(
      project.name,
      formattedExtractions,
      existingContext?.content,
    );

    // Get source meeting IDs
    const sourceMeetingIds = meetingIds.length > 0
      ? meetingIds
      : await getProjectMeetingIds(projectId, db);

    // Save both summaries as new versions
    await Promise.all([
      createSummaryVersion("project", projectId, "context", output.context, sourceMeetingIds, db),
      createSummaryVersion("project", projectId, "briefing", output.briefing, sourceMeetingIds, db),
    ]);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[generateProjectSummaries] Failed for project ${projectId}:`, message);
    return { success: false, error: message };
  }
}

/**
 * Generate or update organization summaries (context + briefing) based on
 * all verified extractions linked to the organization.
 */
export async function generateOrgSummaries(
  organizationId: string,
  meetingIds: string[] = [],
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminClient();

    // Get org name
    const { data: org } = await db
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    if (!org) return { success: false, error: "Organization not found" };

    // Get all verified extractions for this organization
    const { data: extractions } = await db
      .from("extractions")
      .select("type, content, meeting:meetings(title, date)")
      .eq("organization_id", organizationId)
      .eq("verification_status", "verified");

    if (!extractions || extractions.length === 0) {
      return { success: true };
    }

    const formattedExtractions = extractions.map((e) => {
      const meeting = e.meeting as unknown as { title: string | null; date: string | null } | null;
      return {
        type: e.type,
        content: e.content,
        meetingTitle: meeting?.title ?? null,
        meetingDate: meeting?.date ?? null,
      };
    });

    const existingContext = await getLatestSummary("organization", organizationId, "context", db);

    const output = await runOrgSummarizer(
      org.name,
      formattedExtractions,
      existingContext?.content,
    );

    const sourceMeetingIds = meetingIds.length > 0
      ? meetingIds
      : await getOrgMeetingIds(organizationId, db);

    await Promise.all([
      createSummaryVersion("organization", organizationId, "context", output.context, sourceMeetingIds, db),
      createSummaryVersion("organization", organizationId, "briefing", output.briefing, sourceMeetingIds, db),
    ]);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[generateOrgSummaries] Failed for org ${organizationId}:`, message);
    return { success: false, error: message };
  }
}

/**
 * Trigger summary generation for all projects and organizations
 * linked to a specific meeting. Called after meeting verification.
 */
export async function triggerSummariesForMeeting(
  meetingId: string,
): Promise<void> {
  const db = getAdminClient();

  // Get project IDs linked to this meeting
  const { data: projectLinks } = await db
    .from("meeting_projects")
    .select("project_id")
    .eq("meeting_id", meetingId);

  // Get organization IDs from extractions of this meeting
  const { data: orgExtractions } = await db
    .from("extractions")
    .select("organization_id")
    .eq("meeting_id", meetingId)
    .not("organization_id", "is", null);

  const projectIds = [...new Set((projectLinks ?? []).map((l) => l.project_id))];
  const orgIds = [...new Set(
    (orgExtractions ?? [])
      .map((e) => e.organization_id)
      .filter((id): id is string => id !== null),
  )];

  // Also check the meeting itself for organization_id
  const { data: meeting } = await db
    .from("meetings")
    .select("organization_id")
    .eq("id", meetingId)
    .single();

  if (meeting?.organization_id && !orgIds.includes(meeting.organization_id)) {
    orgIds.push(meeting.organization_id);
  }

  // Generate summaries in parallel (fire-and-forget style, errors logged)
  const promises: Promise<unknown>[] = [];

  for (const projectId of projectIds) {
    promises.push(generateProjectSummaries(projectId, [meetingId]));
  }

  for (const orgId of orgIds) {
    promises.push(generateOrgSummaries(orgId, [meetingId]));
  }

  await Promise.allSettled(promises);
}

// ── Helpers ──

async function getProjectMeetingIds(
  projectId: string,
  db: ReturnType<typeof getAdminClient>,
): Promise<string[]> {
  const { data } = await db
    .from("meeting_projects")
    .select("meeting_id")
    .eq("project_id", projectId);
  return (data ?? []).map((l: MeetingLink) => l.meeting_id);
}

async function getOrgMeetingIds(
  organizationId: string,
  db: ReturnType<typeof getAdminClient>,
): Promise<string[]> {
  const { data } = await db
    .from("meetings")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("verification_status", "verified");
  return (data ?? []).map((m: { id: string }) => m.id);
}
