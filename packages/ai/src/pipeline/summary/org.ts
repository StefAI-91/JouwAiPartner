import { getAdminClient } from "@repo/database/supabase/admin";
import { getLatestSummary } from "@repo/database/queries/summaries";
import { createSummaryVersion } from "@repo/database/mutations/summaries";
import { runOrgSummarizer } from "../../agents/project-summarizer";
import {
  formatMeetingForSummary,
  formatEmailForSummary,
  buildTimelineStructuredContent,
} from "./core";

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
    let formattedEmails: ReturnType<typeof formatEmailForSummary>[] = [];
    if (emailIdSet.size > 0) {
      const { data: emails } = await db
        .from("emails")
        .select("subject, date, from_name, from_address, snippet")
        .in("id", Array.from(emailIdSet))
        .eq("verification_status", "verified")
        .eq("filter_status", "kept")
        .order("date", { ascending: false });

      formattedEmails = (emails ?? []).map(formatEmailForSummary);
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

    const formattedMeetings = (meetings ?? []).map(formatMeetingForSummary);

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
    const timelineData = buildTimelineStructuredContent(output.timeline);

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
