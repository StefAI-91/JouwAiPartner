import { getAdminClient } from "@repo/database/supabase/admin";
import { getLatestSummary } from "@repo/database/queries/summaries";
import { getSegmentsByProjectId } from "@repo/database/queries/meetings/project-summaries";
import {
  getProjectName,
  listProjectMeetingIds,
  listProjectEmailIds,
} from "@repo/database/queries/projects/lookup";
import { listVerifiedMeetingsForSummary } from "@repo/database/queries/meetings/pipeline-fetches";
import { listVerifiedEmailsForSummary } from "@repo/database/queries/emails/pipeline";
import { createSummaryVersion } from "@repo/database/mutations/summaries";
import { runProjectSummarizer } from "../../agents/project-summarizer";
import {
  formatMeetingForSummary,
  formatEmailForSummary,
  buildTimelineStructuredContent,
} from "./core";

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

    const projectName = await getProjectName(projectId, db);

    if (!projectName) {
      console.error(`[generateProjectSummaries] Project ${projectId} not found`);
      return { success: false, error: "Project not found" };
    }

    console.info(
      `[generateProjectSummaries] Generating summaries for "${projectName}" (${projectId})`,
    );

    const linkedMeetingIds = await listProjectMeetingIds(projectId, db);
    const linkedEmailIds = await listProjectEmailIds(projectId, db);

    if (linkedMeetingIds.length === 0 && linkedEmailIds.length === 0) {
      console.info(
        `[generateProjectSummaries] No linked meetings or emails for project "${projectName}" — skipping`,
      );
      return { success: false, error: "Geen meetings of emails gekoppeld aan dit project." };
    }

    const meetings = await listVerifiedMeetingsForSummary(linkedMeetingIds, db);

    // Filter out auto-filtered emails (newsletters, notifications, cold outreach):
    // those don't belong in the project briefing.
    const verifiedEmails = await listVerifiedEmailsForSummary(linkedEmailIds, db);
    const formattedEmails = verifiedEmails.map(formatEmailForSummary);

    if (meetings.length === 0 && formattedEmails.length === 0) {
      console.info(
        `[generateProjectSummaries] No verified meetings or emails for project "${projectName}" — skipping`,
      );
      return {
        success: false,
        error: "Geen geverifieerde meetings of emails gevonden voor dit project.",
      };
    }

    console.info(
      `[generateProjectSummaries] Found ${meetings.length} verified meetings, ${formattedEmails.length} verified emails, calling AI...`,
    );

    const formattedMeetings = meetings.map(formatMeetingForSummary);

    const segments = await getSegmentsByProjectId(projectId, db);
    const existingContext = await getLatestSummary("project", projectId, "context", db);

    const output = await runProjectSummarizer(
      projectName,
      formattedMeetings,
      existingContext?.content,
      segments,
      formattedEmails.length > 0 ? formattedEmails : undefined,
    );

    const sourceMeetingIds =
      meetingIds.length > 0 ? meetingIds : await listProjectMeetingIds(projectId, db);

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
