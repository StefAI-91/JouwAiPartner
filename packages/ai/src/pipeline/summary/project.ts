import { getAdminClient } from "@repo/database/supabase/admin";
import { getLatestSummary } from "@repo/database/queries/summaries";
import { getSegmentsByProjectId } from "@repo/database/queries/meetings/project-summaries";
import { createSummaryVersion } from "@repo/database/mutations/summaries";
import { runProjectSummarizer } from "../../agents/project-summarizer";
import {
  formatMeetingForSummary,
  formatEmailForSummary,
  buildTimelineStructuredContent,
} from "./core";

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

    console.info(
      `[generateProjectSummaries] Generating summaries for "${project.name}" (${projectId})`,
    );

    // Get meeting IDs linked to this project via junction table
    const { data: meetingLinks } = await db
      .from("meeting_projects")
      .select("meeting_id")
      .eq("project_id", projectId);

    const linkedMeetingIds = (meetingLinks ?? []).map((l) => l.meeting_id);

    // Get email IDs linked to this project via junction table
    const { data: emailLinks } = await db
      .from("email_projects")
      .select("email_id")
      .eq("project_id", projectId);

    const linkedEmailIds = (emailLinks ?? []).map((l) => l.email_id);

    if (linkedMeetingIds.length === 0 && linkedEmailIds.length === 0) {
      console.info(
        `[generateProjectSummaries] No linked meetings or emails for project "${project.name}" — skipping`,
      );
      return { success: false, error: "Geen meetings of emails gekoppeld aan dit project." };
    }

    // Get verified meetings with their summaries
    const { data: meetings } = await db
      .from("meetings")
      .select("id, title, date, ai_briefing, summary, meeting_type")
      .in("id", linkedMeetingIds)
      .eq("verification_status", "verified")
      .order("date", { ascending: false });

    // Get verified emails linked to this project (filter out auto-filtered
    // emails zoals newsletters, notifications, cold outreach — die horen
    // niet in de project-briefing thuis).
    let formattedEmails: ReturnType<typeof formatEmailForSummary>[] = [];
    if (linkedEmailIds.length > 0) {
      const { data: emails } = await db
        .from("emails")
        .select("subject, date, from_name, from_address, snippet")
        .in("id", linkedEmailIds)
        .eq("verification_status", "verified")
        .eq("filter_status", "kept")
        .order("date", { ascending: false });

      formattedEmails = (emails ?? []).map(formatEmailForSummary);
    }

    if ((!meetings || meetings.length === 0) && formattedEmails.length === 0) {
      console.info(
        `[generateProjectSummaries] No verified meetings or emails for project "${project.name}" — skipping`,
      );
      return {
        success: false,
        error: "Geen geverifieerde meetings of emails gevonden voor dit project.",
      };
    }

    console.info(
      `[generateProjectSummaries] Found ${meetings?.length ?? 0} verified meetings, ${formattedEmails.length} verified emails, calling AI...`,
    );

    const formattedMeetings = (meetings ?? []).map(formatMeetingForSummary);

    // Get project-specific segments (kernpunten per meeting)
    const segments = await getSegmentsByProjectId(projectId, db);

    // Get existing context summary to provide as reference
    const existingContext = await getLatestSummary("project", projectId, "context", db);

    // Generate both summaries (with segment data + email data for precision)
    const output = await runProjectSummarizer(
      project.name,
      formattedMeetings,
      existingContext?.content,
      segments,
      formattedEmails.length > 0 ? formattedEmails : undefined,
    );

    // Get source meeting IDs
    const sourceMeetingIds =
      meetingIds.length > 0 ? meetingIds : await getProjectMeetingIds(projectId, db);

    // Save both summaries as new versions
    // Timeline is stored as structured_content on the briefing summary
    const timelineData = buildTimelineStructuredContent(output.timeline);

    const [contextResult, briefingResult] = await Promise.all([
      createSummaryVersion("project", projectId, "context", output.context, sourceMeetingIds, db),
      createSummaryVersion(
        "project",
        projectId,
        "briefing",
        output.briefing,
        sourceMeetingIds,
        db,
        timelineData,
      ),
    ]);

    if ("error" in contextResult) {
      console.error(`[generateProjectSummaries] Failed to save context:`, contextResult.error);
      return { success: false, error: contextResult.error };
    }
    if ("error" in briefingResult) {
      console.error(`[generateProjectSummaries] Failed to save briefing:`, briefingResult.error);
      return { success: false, error: briefingResult.error };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[generateProjectSummaries] Failed for project ${projectId}:`, message);
    return { success: false, error: message };
  }
}

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
