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
    const { data: project } = await db.from("projects").select("name").eq("id", projectId).single();

    if (!project) {
      console.error(`[generateProjectSummaries] Project ${projectId} not found`);
      return { success: false, error: "Project not found" };
    }

    console.log(
      `[generateProjectSummaries] Generating summaries for "${project.name}" (${projectId})`,
    );

    // Get meeting IDs linked to this project via junction table
    const { data: meetingLinks } = await db
      .from("meeting_projects")
      .select("meeting_id")
      .eq("project_id", projectId);

    const linkedMeetingIds = (meetingLinks ?? []).map((l) => l.meeting_id);

    if (linkedMeetingIds.length === 0) {
      console.log(
        `[generateProjectSummaries] No linked meetings for project "${project.name}" — skipping`,
      );
      return { success: false, error: "Geen meetings gekoppeld aan dit project." };
    }

    // Get verified meetings with their summaries
    const { data: meetings } = await db
      .from("meetings")
      .select("id, title, date, ai_briefing, summary, meeting_type")
      .in("id", linkedMeetingIds)
      .eq("verification_status", "verified")
      .order("date", { ascending: false });

    if (!meetings || meetings.length === 0) {
      console.log(
        `[generateProjectSummaries] No verified meetings for project "${project.name}" — skipping`,
      );
      return { success: false, error: "Geen geverifieerde meetings gevonden voor dit project." };
    }

    console.log(
      `[generateProjectSummaries] Found ${meetings.length} verified meetings, calling AI...`,
    );

    const formattedMeetings = meetings.map((m) => ({
      title: m.title,
      date: m.date,
      meetingType: m.meeting_type,
      briefing: m.ai_briefing,
      summary: m.summary,
    }));

    // Get existing context summary to provide as reference
    const existingContext = await getLatestSummary("project", projectId, "context", db);

    // Generate both summaries
    const output = await runProjectSummarizer(
      project.name,
      formattedMeetings,
      existingContext?.content,
    );

    // Get source meeting IDs
    const sourceMeetingIds =
      meetingIds.length > 0 ? meetingIds : await getProjectMeetingIds(projectId, db);

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

    console.log(
      `[generateOrgSummaries] Generating summaries for "${org.name}" (${organizationId})`,
    );

    // Get verified meetings linked to this organization
    const { data: meetings } = await db
      .from("meetings")
      .select("id, title, date, ai_briefing, summary, meeting_type")
      .eq("organization_id", organizationId)
      .eq("verification_status", "verified")
      .order("date", { ascending: false });

    if (!meetings || meetings.length === 0) {
      console.log(`[generateOrgSummaries] No verified meetings for org "${org.name}" — skipping`);
      return {
        success: false,
        error: "Geen geverifieerde meetings gevonden voor deze organisatie.",
      };
    }

    console.log(`[generateOrgSummaries] Found ${meetings.length} verified meetings, calling AI...`);

    const formattedMeetings = meetings.map((m) => ({
      title: m.title,
      date: m.date,
      meetingType: m.meeting_type,
      briefing: m.ai_briefing,
      summary: m.summary,
    }));

    const existingContext = await getLatestSummary("organization", organizationId, "context", db);

    const output = await runOrgSummarizer(org.name, formattedMeetings, existingContext?.content);

    const sourceMeetingIds =
      meetingIds.length > 0 ? meetingIds : await getOrgMeetingIds(organizationId, db);

    await Promise.all([
      createSummaryVersion(
        "organization",
        organizationId,
        "context",
        output.context,
        sourceMeetingIds,
        db,
      ),
      createSummaryVersion(
        "organization",
        organizationId,
        "briefing",
        output.briefing,
        sourceMeetingIds,
        db,
      ),
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
export async function triggerSummariesForMeeting(meetingId: string): Promise<void> {
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
  const orgIds = [
    ...new Set(
      (orgExtractions ?? [])
        .map((e) => e.organization_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  // Also check the meeting itself for organization_id
  const { data: meeting } = await db
    .from("meetings")
    .select("organization_id")
    .eq("id", meetingId)
    .single();

  if (meeting?.organization_id && !orgIds.includes(meeting.organization_id)) {
    orgIds.push(meeting.organization_id);
  }

  console.log(
    `[triggerSummaries] Found ${projectIds.length} projects, ${orgIds.length} orgs for meeting ${meetingId}`,
  );

  if (projectIds.length === 0 && orgIds.length === 0) {
    console.log(
      "[triggerSummaries] No linked projects or organizations — skipping summary generation",
    );
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
