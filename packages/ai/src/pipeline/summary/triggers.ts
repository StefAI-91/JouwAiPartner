import { getAdminClient } from "@repo/database/supabase/admin";
import {
  listMeetingProjectIds,
  getMeetingOrganizationId,
} from "@repo/database/queries/meetings/metadata";
import {
  listMeetingExtractionOrgIds,
  listEmailExtractionOrgIds,
} from "@repo/database/queries/extractions";
import {
  listEmailProjectIds,
  getEmailOrganizationId,
} from "@repo/database/queries/emails/pipeline";
import { generateProjectSummaries } from "./project";
import { generateOrgSummaries } from "./org";

/**
 * Trigger summary generation for all projects and organizations
 * linked to a specific meeting. Called after meeting verification.
 */
export async function triggerSummariesForMeeting(meetingId: string): Promise<void> {
  console.info(`[triggerSummaries] Starting for meeting ${meetingId}`);
  const db = getAdminClient();

  const projectIdsRaw = await listMeetingProjectIds(meetingId, db);
  const extractionOrgIds = await listMeetingExtractionOrgIds(meetingId, db);
  const meetingOrgId = await getMeetingOrganizationId(meetingId, db);

  const projectIds = [...new Set(projectIdsRaw)];
  const orgIds = [...extractionOrgIds];
  if (meetingOrgId && !orgIds.includes(meetingOrgId)) {
    orgIds.push(meetingOrgId);
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

  const projectIdsRaw = await listEmailProjectIds(emailId, db);
  const emailOrgId = await getEmailOrganizationId(emailId, db);
  const extractionOrgIds = await listEmailExtractionOrgIds(emailId, db);

  const projectIds = [...new Set(projectIdsRaw)];
  const orgIds: string[] = [];
  if (emailOrgId) orgIds.push(emailOrgId);
  for (const id of extractionOrgIds) {
    if (!orgIds.includes(id)) orgIds.push(id);
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
