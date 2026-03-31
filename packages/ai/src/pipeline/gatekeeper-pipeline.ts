import { runGatekeeper } from "../agents/gatekeeper";
import { runExtractor, ExtractorOutput } from "../agents/extractor";
import { GatekeeperOutput } from "../validations/gatekeeper";
import { insertMeeting } from "@repo/database/mutations/meetings";
import { resolveOrganization } from "./entity-resolution";
import { findPeopleByEmails } from "@repo/database/queries/people";
import { linkMeetingParticipants } from "@repo/database/mutations/meeting-participants";
import { saveExtractions } from "./save-extractions";
import { embedMeetingWithExtractions } from "./embed-pipeline";

interface MeetingInput {
  fireflies_id: string;
  title: string;
  date: string;
  participants: string[];
  summary: string;
  topics: string[];
  transcript: string;
  raw_fireflies?: Record<string, unknown>;
}

/**
 * Match participant emails to known people and link them to the meeting.
 */
async function matchParticipants(meetingId: string, participants: string[]): Promise<number> {
  const emails = participants.map((p) => p.toLowerCase().trim()).filter((p) => p.includes("@"));
  if (emails.length === 0) return 0;

  const emailToPersonId = await findPeopleByEmails(emails);
  const personIds = [...emailToPersonId.values()];
  if (personIds.length === 0) return 0;

  const result = await linkMeetingParticipants(meetingId, personIds);
  if ("error" in result) {
    console.error("Failed to link participants:", result.error);
    return 0;
  }
  return result.linked;
}

interface PipelineResult {
  gatekeeper: GatekeeperOutput;
  extractor: ExtractorOutput | null;
  meetingId: string | null;
  extractions_saved: number;
  embedded: boolean;
  errors: string[];
}

/**
 * Full meeting processing pipeline:
 * 1. Gatekeeper: classify meeting type, party, relevance
 * 2. Insert meeting (always — no rejection)
 * 3. Match participants
 * 4. Extractor: extract decisions, action items, needs, insights
 * 5. Save extractions to unified table
 * 6. Embed meeting + extractions
 */
export async function processMeeting(input: MeetingInput): Promise<PipelineResult> {
  // Step 1: Classify with Gatekeeper
  const gatekeeperResult = await runGatekeeper(input.summary, {
    title: input.title,
    participants: input.participants,
    date: input.date,
    topics: input.topics,
  });

  // Step 2: Resolve organization
  const orgResult = await resolveOrganization(gatekeeperResult.organization_name);

  // Step 3: Build raw_fireflies JSONB (original Fireflies data + pipeline metadata)
  const rawFireflies: Record<string, unknown> = {
    ...(input.raw_fireflies ?? {}),
    pipeline: {
      gatekeeper: {
        meeting_type: gatekeeperResult.meeting_type,
        party_type: gatekeeperResult.party_type,
        relevance_score: gatekeeperResult.relevance_score,
        reason: gatekeeperResult.reason,
        organization_name: gatekeeperResult.organization_name,
      },
      processed_at: new Date().toISOString(),
    },
  };

  // Step 4: Insert meeting
  const insertResult = await insertMeeting({
    fireflies_id: input.fireflies_id,
    title: input.title,
    date: new Date(Number(input.date)).toISOString(),
    participants: input.participants,
    summary: input.summary,
    transcript: input.transcript,
    meeting_type: gatekeeperResult.meeting_type,
    party_type: gatekeeperResult.party_type,
    relevance_score: gatekeeperResult.relevance_score,
    organization_id: orgResult.organization_id,
    unmatched_organization_name: orgResult.matched ? null : gatekeeperResult.organization_name,
    raw_fireflies: rawFireflies,
    embedding_stale: true,
    verification_status: "draft",
  });

  let meetingId: string | null = null;
  if ("error" in insertResult) {
    console.error("Meeting insert error:", insertResult.error);
    return {
      gatekeeper: gatekeeperResult,
      extractor: null,
      meetingId: null,
      extractions_saved: 0,
      embedded: false,
      errors: [`Meeting insert: ${insertResult.error}`],
    };
  }

  meetingId = insertResult.data.id;

  // Step 5: Match participants
  await matchParticipants(meetingId, input.participants);

  // Step 6: Run Extractor agent
  let extractorResult: ExtractorOutput | null = null;
  let extractionsSaved = 0;
  let extractorError: string | null = null;

  try {
    extractorResult = await runExtractor(input.transcript, {
      title: input.title,
      meeting_type: gatekeeperResult.meeting_type,
      party_type: gatekeeperResult.party_type,
      participants: input.participants,
      summary: input.summary,
    });

    // Add extractor output to raw_fireflies
    rawFireflies.pipeline = {
      ...(rawFireflies.pipeline as Record<string, unknown>),
      extractor: {
        extractions_count: extractorResult.extractions.length,
        entities: extractorResult.entities,
        primary_project: extractorResult.primary_project,
      },
    };

    // Update raw_fireflies with extractor metadata
    const { getAdminClient } = await import("@repo/database/supabase/admin");
    await getAdminClient()
      .from("meetings")
      .update({ raw_fireflies: rawFireflies })
      .eq("id", meetingId);

    // Step 7: Save extractions
    const saveResult = await saveExtractions(extractorResult, meetingId);
    extractionsSaved = saveResult.extractions_saved;

    console.log(
      `Extractor: ${extractionsSaved} extractions saved, project linked: ${saveResult.project_linked}`,
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Extractor failed:", errMsg);
    extractorError = errMsg;
  }

  // Step 8: Embed meeting + extractions
  let embedded = false;
  let embedError: string | null = null;
  try {
    await embedMeetingWithExtractions(meetingId);
    embedded = true;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Embedding failed:", errMsg);
    embedError = errMsg;
  }

  const errors: string[] = [];
  if (extractorError) errors.push(`Extractor: ${extractorError}`);
  if (embedError) errors.push(`Embedding: ${embedError}`);

  return {
    gatekeeper: gatekeeperResult,
    extractor: extractorResult,
    meetingId,
    extractions_saved: extractionsSaved,
    embedded,
    errors,
  };
}
