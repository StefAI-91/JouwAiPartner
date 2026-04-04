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

    if (!project) {
      console.error(`[generateProjectSummaries] Project ${projectId} not found`);
      return { success: false, error: "Project not found" };
    }

    console.log(`[generateProjectSummaries] Generating summaries for "${project.name}" (${projectId})`);

    // Get meeting IDs linked to this project via junction table
    const { data: meetingLinks } = await db
      .from("meeting_projects")
      .select("meeting_id")
      .eq("project_id", projectId);

    const linkedMeetingIds = (meetingLinks ?? []).map((l) => l.meeting_id);

    // Get extractions from two sources:
    // 1. Directly linked via extractions.project_id
    // 2. From meetings linked via meeting_projects (regardless of extraction.project_id)
    const { data: directExtractions } = await db
      .from("extractions")
      .select("id, type, content, meeting:meetings(title, date)")
      .eq("project_id", projectId)
      .eq("verification_status", "verified");

    let meetingExtractions: typeof directExtractions = [];
    if (linkedMeetingIds.length > 0) {
      const { data } = await db
        .from("extractions")
        .select("id, type, content, meeting:meetings(title, date)")
        .in("meeting_id", linkedMeetingIds)
        .eq("verification_status", "verified");
      meetingExtractions = data;
    }

    // Merge and deduplicate by extraction ID
    const seen = new Set<string>();
    const allExtractions = [...(directExtractions ?? []), ...(meetingExtractions ?? [])].filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    if (allExtractions.length === 0) {
      console.log(`[generateProjectSummaries] No verified extractions for project "${project.name}" — skipping`);
      return { success: false, error: "Geen verified extracties gevonden. Koppel meetings aan dit project en zorg dat ze geverifieerd zijn." };
    }

    console.log(`[generateProjectSummaries] Found ${allExtractions.length} verified extractions (${(directExtractions ?? []).length} direct, ${(meetingExtractions ?? []).length} via meetings), calling AI...`);

    const formattedExtractions = allExtractions.map((e) => {
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

    if (!org) {
      console.error(`[generateOrgSummaries] Organization ${organizationId} not found`);
      return { success: false, error: "Organization not found" };
    }

    console.log(`[generateOrgSummaries] Generating summaries for "${org.name}" (${organizationId})`);

    // Get all verified extractions for this organization
    const { data: extractions, error: extError } = await db
      .from("extractions")
      .select("type, content, meeting:meetings(title, date)")
      .eq("organization_id", organizationId)
      .eq("verification_status", "verified");

    if (extError) {
      console.error(`[generateOrgSummaries] Failed to get extractions:`, extError.message);
      return { success: false, error: extError.message };
    }

    if (!extractions || extractions.length === 0) {
      console.log(`[generateOrgSummaries] No verified extractions for org "${org.name}" — skipping`);
      return { success: false, error: "Geen verified extracties gevonden voor deze organisatie." };
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
  console.log(`[triggerSummaries] Starting for meeting ${meetingId}`);
  const db = getAdminClient();

  // Get project IDs linked to this meeting
  const { data: projectLinks, error: plError } = await db
    .from("meeting_projects")
    .select("project_id")
    .eq("meeting_id", meetingId);

  if (plError) {
    console.error("[triggerSummaries] Failed to get project links:", plError.message);
  }

  // Get organization IDs from extractions of this meeting
  const { data: orgExtractions, error: oeError } = await db
    .from("extractions")
    .select("organization_id")
    .eq("meeting_id", meetingId)
    .not("organization_id", "is", null);

  if (oeError) {
    console.error("[triggerSummaries] Failed to get org extractions:", oeError.message);
  }

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

  console.log(`[triggerSummaries] Found ${projectIds.length} projects, ${orgIds.length} orgs for meeting ${meetingId}`);

  if (projectIds.length === 0 && orgIds.length === 0) {
    console.log("[triggerSummaries] No linked projects or organizations — skipping summary generation");
    return;
  }

  // Generate summaries in parallel
  const results = await Promise.allSettled([
    ...projectIds.map((id) => generateProjectSummaries(id, [meetingId])),
    ...orgIds.map((id) => generateOrgSummaries(id, [meetingId])),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[triggerSummaries] Promise rejected:", result.reason);
    } else if (!result.value.success) {
      console.error("[triggerSummaries] Generation failed:", result.value.error);
    }
  }

  console.log(`[triggerSummaries] Completed for meeting ${meetingId}`);
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
