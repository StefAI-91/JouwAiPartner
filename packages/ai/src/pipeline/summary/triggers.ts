import { getAdminClient } from "@repo/database/supabase/admin";
import { generateProjectSummaries } from "./project";
import { generateOrgSummaries } from "./org";

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
