import { getAdminClient } from "@repo/database/supabase/admin";
import { getLatestSummary } from "@repo/database/queries/summaries";
import { getSegmentsByProjectId } from "@repo/database/queries/meetings/project-summaries";
import { createSummaryVersion } from "@repo/database/mutations/summaries";
import { runProjectSummarizer, runOrgSummarizer } from "../../agents/project-summarizer";

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
    let formattedEmails: {
      subject: string | null;
      date: string;
      from: string;
      snippet: string | null;
    }[] = [];
    if (linkedEmailIds.length > 0) {
      const { data: emails } = await db
        .from("emails")
        .select("subject, date, from_name, from_address, snippet")
        .in("id", linkedEmailIds)
        .eq("verification_status", "verified")
        .eq("filter_status", "kept")
        .order("date", { ascending: false });

      formattedEmails = (emails ?? []).map((e) => ({
        subject: e.subject,
        date: e.date,
        from: e.from_name ?? e.from_address,
        snippet: e.snippet,
      }));
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

    const formattedMeetings = (meetings ?? []).map((m) => ({
      title: m.title,
      date: m.date,
      meetingType: m.meeting_type,
      briefing: m.ai_briefing,
      summary: m.summary,
    }));

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
    const timelineData = output.timeline.length > 0 ? { timeline: output.timeline } : null;

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

/**
 * Generate or update organization summaries (context + briefing + timeline)
 * based on all verified meetings and emails linked to the organization.
 * Called after a meeting or email is verified that is linked to this org.
 *
 * Briefing-perspectief schakelt op basis van aantal gekoppelde projecten:
 * - 0 projecten → relatie-gerichte briefing
 * - ≥1 project  → overkoepelende briefing over alle projecten heen
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

    console.info(
      `[generateOrgSummaries] Generating summaries for "${org.name}" (${organizationId})`,
    );

    // Get verified meetings linked to this organization
    const { data: meetings } = await db
      .from("meetings")
      .select("id, title, date, ai_briefing, summary, meeting_type")
      .eq("organization_id", organizationId)
      .eq("verification_status", "verified")
      .order("date", { ascending: false });

    // Get email IDs linked to this organization — via twee paden:
    // 1) emails.organization_id = orgId (primary link — zónder extracties)
    // 2) email_extractions.organization_id = orgId (extraction-level link)
    // Dedup'n op email_id. De status-filters (verified + kept) passen we
    // pas toe in de finale fetch, zodat we ze niet dubbel hoeven te draaien.
    const emailIdSet = new Set<string>();

    const { data: directEmails } = await db
      .from("emails")
      .select("id")
      .eq("organization_id", organizationId);
    for (const e of directEmails ?? []) emailIdSet.add(e.id);

    const { data: extractionEmailLinks } = await db
      .from("email_extractions")
      .select("email_id")
      .eq("organization_id", organizationId);
    for (const l of extractionEmailLinks ?? []) {
      if (l.email_id) emailIdSet.add(l.email_id);
    }

    // Finale fetch filtert op verified + kept, zodat newsletters,
    // notifications, cold outreach en onverified drafts niet in de briefing
    // belanden, ongeacht via welk pad hun ID is binnengekomen.
    let formattedEmails: {
      subject: string | null;
      date: string;
      from: string;
      snippet: string | null;
    }[] = [];
    if (emailIdSet.size > 0) {
      const { data: emails } = await db
        .from("emails")
        .select("subject, date, from_name, from_address, snippet")
        .in("id", Array.from(emailIdSet))
        .eq("verification_status", "verified")
        .eq("filter_status", "kept")
        .order("date", { ascending: false });

      formattedEmails = (emails ?? []).map((e) => ({
        subject: e.subject,
        date: e.date,
        from: e.from_name ?? e.from_address,
        snippet: e.snippet,
      }));
    }

    if ((!meetings || meetings.length === 0) && formattedEmails.length === 0) {
      console.info(
        `[generateOrgSummaries] No verified meetings or emails for org "${org.name}" — skipping`,
      );
      return {
        success: false,
        error: "Geen geverifieerde meetings of emails gevonden voor deze organisatie.",
      };
    }

    // Count actieve gekoppelde projecten (bepaalt briefing-invalshoek).
    // Archived/afgeronde projecten (completed, lost) tellen niet mee — een
    // org met alleen afgeronde projecten is effectief een relatie-only klant.
    const { count: projectCount } = await db
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .not("status", "in", '("completed","lost")');

    console.info(
      `[generateOrgSummaries] Found ${meetings?.length ?? 0} verified meetings, ` +
        `${formattedEmails.length} verified emails, ${projectCount ?? 0} projects — calling AI...`,
    );

    const formattedMeetings = (meetings ?? []).map((m) => ({
      title: m.title,
      date: m.date,
      meetingType: m.meeting_type,
      briefing: m.ai_briefing,
      summary: m.summary,
    }));

    const existingContext = await getLatestSummary("organization", organizationId, "context", db);

    const output = await runOrgSummarizer(
      org.name,
      formattedMeetings,
      existingContext?.content,
      formattedEmails.length > 0 ? formattedEmails : undefined,
      projectCount ?? 0,
    );

    const sourceMeetingIds =
      meetingIds.length > 0 ? meetingIds : await getOrgMeetingIds(organizationId, db);

    // Timeline wordt op de briefing-summary opgeslagen als structured_content,
    // identiek aan het project-summary patroon.
    const timelineData = output.timeline.length > 0 ? { timeline: output.timeline } : null;

    const [contextResult, briefingResult] = await Promise.all([
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
        timelineData,
      ),
    ]);

    if ("error" in contextResult) {
      console.error(`[generateOrgSummaries] Failed to save context:`, contextResult.error);
      return { success: false, error: contextResult.error };
    }
    if ("error" in briefingResult) {
      console.error(`[generateOrgSummaries] Failed to save briefing:`, briefingResult.error);
      return { success: false, error: briefingResult.error };
    }

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
  console.info(`[triggerSummaries] Starting for meeting ${meetingId}`);
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

  console.info(
    `[triggerSummaries] Found ${projectIds.length} projects, ${orgIds.length} orgs for meeting ${meetingId}`,
  );

  if (projectIds.length === 0 && orgIds.length === 0) {
    console.info(
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

  console.info(`[triggerSummaries] Completed for meeting ${meetingId}`);
}

/**
 * Trigger summary generation for all projects and organizations
 * linked to a specific email. Called after email verification.
 */
export async function triggerSummariesForEmail(emailId: string): Promise<void> {
  console.info(`[triggerSummariesForEmail] Starting for email ${emailId}`);
  const db = getAdminClient();

  // Get project IDs linked to this email
  const { data: projectLinks, error: plError } = await db
    .from("email_projects")
    .select("project_id")
    .eq("email_id", emailId);

  if (plError) {
    console.error("[triggerSummariesForEmail] Failed to get project links:", plError.message);
  }

  // Get organization ID from the email itself
  const { data: email } = await db
    .from("emails")
    .select("organization_id")
    .eq("id", emailId)
    .single();

  const projectIds = [...new Set((projectLinks ?? []).map((l) => l.project_id))];
  const orgIds: string[] = [];
  if (email?.organization_id) {
    orgIds.push(email.organization_id);
  }

  // Also check email_extractions for organization_id
  const { data: emailExtractions, error: eeError } = await db
    .from("email_extractions")
    .select("organization_id")
    .eq("email_id", emailId)
    .not("organization_id", "is", null);

  if (eeError) {
    console.error("[triggerSummariesForEmail] Failed to get org extractions:", eeError.message);
  }

  for (const ex of emailExtractions ?? []) {
    if (ex.organization_id && !orgIds.includes(ex.organization_id)) {
      orgIds.push(ex.organization_id);
    }
  }

  console.info(
    `[triggerSummariesForEmail] Found ${projectIds.length} projects, ${orgIds.length} orgs for email ${emailId}`,
  );

  if (projectIds.length === 0 && orgIds.length === 0) {
    console.info(
      "[triggerSummariesForEmail] No linked projects or organizations — skipping summary generation",
    );
    return;
  }

  // Generate summaries in parallel
  const results = await Promise.allSettled([
    ...projectIds.map((id) => generateProjectSummaries(id)),
    ...orgIds.map((id) => generateOrgSummaries(id)),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[triggerSummariesForEmail] Promise rejected:", result.reason);
    } else if (!result.value.success) {
      console.error("[triggerSummariesForEmail] Generation failed:", result.value.error);
    }
  }

  console.info(`[triggerSummariesForEmail] Completed for email ${emailId}`);
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
