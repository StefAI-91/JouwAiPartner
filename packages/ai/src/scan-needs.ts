import { getAdminClient } from "@repo/database/supabase/admin";
import { insertExtractions } from "@repo/database/mutations/extractions";
import { runNeedsScanner } from "./agents/needs-scanner";
import type { NeedItem } from "./validations/needs-scanner";

interface MeetingForScan {
  id: string;
  title: string;
  date: string;
  meeting_type: string;
  party_type: string;
  summary: string;
  participants: string[];
}

/**
 * Check if a meeting has already been scanned for needs.
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
async function getMeetingForNeedsScan(meetingId: string): Promise<MeetingForScan | null> {
  const { data, error } = await getAdminClient()
    .from("meetings")
    .select(
      `id, title, date, meeting_type, party_type, summary, participants,
       meeting_participants(person:people(name))`,
    )
    .eq("id", meetingId)
    .single();

  if (error || !data) return null;

  // Supabase nested join requires cast — safe because we control the select columns
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
    summary: data.summary ?? "",
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
      status: "open",
    },
    project_id: null,
    embedding_stale: true,
    verification_status: "verified",
  }));
}

/**
 * Scan a single meeting and save extracted needs.
 * Returns the number of needs found, or throws on actual errors.
 */
async function scanAndSaveNeeds(meeting: MeetingForScan): Promise<number> {
  const output = await runNeedsScanner(meeting.summary, {
    title: meeting.title,
    meeting_type: meeting.meeting_type,
    meeting_date: meeting.date.slice(0, 10),
    participants: meeting.participants,
  });

  if (output.scan_notes) {
    console.warn(`[scanMeetingNeeds] ${meeting.id}: ${output.scan_notes}`);
  }

  if (output.needs.length > 0) {
    const rows = buildNeedRows(output.needs, meeting.id);
    const result = await insertExtractions(rows);
    if ("error" in result) {
      throw new Error(`Insert failed: ${result.error}`);
    }
  }

  return output.needs.length;
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

  if (!meeting.summary) {
    return { scanned: false, needs_found: 0, skipped_reason: "no_summary" };
  }

  try {
    const needsFound = await scanAndSaveNeeds(meeting);
    return { scanned: true, needs_found: needsFound };
  } catch (err) {
    console.error(`[scanMeetingNeeds] ${meetingId}:`, err);
    return { scanned: false, needs_found: 0, skipped_reason: "scan_failed" };
  }
}

/**
 * Batch scan all verified internal team syncs that haven't been scanned yet.
 * Uses a single query with NOT EXISTS to avoid N+1.
 */
export async function scanAllUnscannedMeetings(): Promise<{
  total_scanned: number;
  total_needs: number;
  errors: string[];
}> {
  const db = getAdminClient();

  // Single query: get unscanned internal team syncs with all needed data
  // Uses left join + is.null to find meetings without need-type extractions
  const { data: allMeetings, error: meetingsError } = await db
    .from("meetings")
    .select(
      `id, title, date, meeting_type, party_type, summary, participants,
       meeting_participants(person:people(name))`,
    )
    .eq("verification_status", "verified")
    .eq("meeting_type", "team_sync")
    .eq("party_type", "internal")
    .not("summary", "is", null);

  if (meetingsError || !allMeetings) {
    return {
      total_scanned: 0,
      total_needs: 0,
      errors: [meetingsError?.message ?? "No meetings found"],
    };
  }

  // Batch check which meetings already have need extractions (single query)
  const meetingIds = allMeetings.map((m) => m.id);
  const { data: scannedRows } = await db
    .from("extractions")
    .select("meeting_id")
    .eq("type", "need")
    .in("meeting_id", meetingIds);

  const alreadyScanned = new Set((scannedRows ?? []).map((r) => r.meeting_id));

  // Filter to unscanned meetings and map to MeetingForScan
  const unscanned: MeetingForScan[] = allMeetings
    .filter((m) => !alreadyScanned.has(m.id))
    .map((data) => {
      // Supabase nested join requires cast
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
        summary: data.summary ?? "",
        participants: participantNames as string[],
      };
    });

  let totalScanned = 0;
  let totalNeeds = 0;
  const errors: string[] = [];

  for (const meeting of unscanned) {
    try {
      const needsFound = await scanAndSaveNeeds(meeting);
      totalScanned++;
      totalNeeds += needsFound;
    } catch (err) {
      errors.push(`${meeting.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return { total_scanned: totalScanned, total_needs: totalNeeds, errors };
}
