import { getAdminClient } from "@repo/database/supabase/admin";
import { insertExtractions } from "@repo/database/mutations/extractions";
import { runNeedsScanner } from "../agents/needs-scanner";
import type { NeedItem } from "../validations/needs-scanner";

/**
 * Check if a meeting has already been scanned for needs.
 * Looks for existing extractions with type "need" for this meeting.
 */
async function meetingAlreadyScanned(meetingId: string): Promise<boolean> {
  const { count } = await getAdminClient()
    .from("extractions")
    .select("id", { count: "exact", head: true })
    .eq("meeting_id", meetingId)
    .eq("type", "need");

  return (count ?? 0) > 0;
}

/**
 * Get meeting data needed for the needs scan.
 */
async function getMeetingForNeedsScan(meetingId: string) {
  const { data, error } = await getAdminClient()
    .from("meetings")
    .select(
      `id, title, date, meeting_type, party_type, summary, participants,
       meeting_participants(person:people(name))`,
    )
    .eq("id", meetingId)
    .single();

  if (error || !data) return null;

  const participantNames =
    (data.meeting_participants as unknown as { person: { name: string } }[])?.map(
      (mp) => mp.person.name,
    ) ??
    data.participants ??
    [];

  return {
    id: data.id,
    title: data.title ?? "Untitled",
    date: data.date ?? new Date().toISOString(),
    meeting_type: data.meeting_type ?? "team_sync",
    party_type: data.party_type ?? "internal",
    summary: data.summary,
    participants: participantNames as string[],
  };
}

/**
 * Build extraction rows from scanned needs.
 */
function buildNeedRows(needs: NeedItem[], meetingId: string) {
  return needs.map((need) => ({
    meeting_id: meetingId,
    type: "need" as const,
    content: need.content,
    confidence: 1.0,
    transcript_ref: need.source_quote,
    metadata: {
      category: need.category,
      priority: need.priority,
      context: need.context,
      source: "needs_scanner",
    },
    project_id: null,
    embedding_stale: true,
    verification_status: "verified",
  }));
}

/**
 * Scan a single meeting for needs. Skips if already scanned.
 * Called automatically after meeting verification for team meetings.
 */
export async function scanMeetingNeeds(meetingId: string): Promise<{
  scanned: boolean;
  needs_found: number;
  skipped_reason?: string;
}> {
  // Check if already scanned
  if (await meetingAlreadyScanned(meetingId)) {
    return { scanned: false, needs_found: 0, skipped_reason: "already_scanned" };
  }

  // Get meeting data
  const meeting = await getMeetingForNeedsScan(meetingId);
  if (!meeting) {
    return { scanned: false, needs_found: 0, skipped_reason: "meeting_not_found" };
  }

  // Only scan internal team syncs
  if (meeting.meeting_type !== "team_sync" || meeting.party_type !== "internal") {
    return { scanned: false, needs_found: 0, skipped_reason: "not_internal_team_sync" };
  }

  // Need a summary to scan
  if (!meeting.summary) {
    return { scanned: false, needs_found: 0, skipped_reason: "no_summary" };
  }

  // Run the scanner
  const output = await runNeedsScanner(meeting.summary, {
    title: meeting.title,
    meeting_type: meeting.meeting_type,
    meeting_date: meeting.date.slice(0, 10),
    participants: meeting.participants,
  });

  if (output.scan_notes) {
    console.log(`[scanMeetingNeeds] ${meetingId}: ${output.scan_notes}`);
  }

  // Save needs as extractions
  if (output.needs.length > 0) {
    const rows = buildNeedRows(output.needs, meetingId);
    const result = await insertExtractions(rows);
    if ("error" in result) {
      console.error("[scanMeetingNeeds] Failed to insert needs:", result.error);
      return { scanned: false, needs_found: 0, skipped_reason: "insert_failed" };
    }
  }

  return { scanned: true, needs_found: output.needs.length };
}

/**
 * Batch scan all verified team meetings that haven't been scanned yet.
 * Useful for backfilling needs from existing meetings.
 */
export async function scanAllUnscannedMeetings(): Promise<{
  total_scanned: number;
  total_needs: number;
  errors: string[];
}> {
  const db = getAdminClient();

  // Get all verified internal team syncs
  const { data: meetings, error } = await db
    .from("meetings")
    .select("id")
    .eq("verification_status", "verified")
    .eq("meeting_type", "team_sync")
    .eq("party_type", "internal")
    .not("summary", "is", null);

  if (error || !meetings) {
    return { total_scanned: 0, total_needs: 0, errors: [error?.message ?? "No meetings found"] };
  }

  let totalScanned = 0;
  let totalNeeds = 0;
  const errors: string[] = [];

  for (const meeting of meetings) {
    try {
      const result = await scanMeetingNeeds(meeting.id);
      if (result.scanned) {
        totalScanned++;
        totalNeeds += result.needs_found;
      }
    } catch (err) {
      errors.push(`${meeting.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return { total_scanned: totalScanned, total_needs: totalNeeds, errors };
}
