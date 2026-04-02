import { runGatekeeper } from "../agents/gatekeeper";
import type { ParticipantInfo } from "../agents/gatekeeper";
import { runExtractor, ExtractorOutput } from "../agents/extractor";
import { GatekeeperOutput } from "../validations/gatekeeper";
import type { PartyType } from "../validations/gatekeeper";
import { insertMeeting } from "@repo/database/mutations/meetings";
import { resolveOrganization } from "./entity-resolution";
import { findPeopleByEmails } from "@repo/database/queries/people";
import { linkMeetingParticipants } from "@repo/database/mutations/meeting-participants";
import { saveExtractions } from "./save-extractions";
import { embedMeetingWithExtractions } from "./embed-pipeline";
import { classifyParticipants, determinePartyType } from "./participant-classifier";
import { transcribeWithElevenLabs, formatScribeTranscript } from "../transcribe-elevenlabs";
import { updateMeetingElevenLabs } from "@repo/database/mutations/meetings";

interface MeetingInput {
  fireflies_id: string;
  title: string;
  date: string;
  participants: string[];
  summary: string;
  topics: string[];
  transcript: string;
  raw_fireflies?: Record<string, unknown>;
  audio_url?: string;
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
  partyType: PartyType;
  extractor: ExtractorOutput | null;
  meetingId: string | null;
  extractions_saved: number;
  embedded: boolean;
  elevenlabs_transcribed: boolean;
  errors: string[];
}

/**
 * Full meeting processing pipeline:
 * 1. Classify participants as internal/external (people table lookup)
 * 2. Determine party_type deterministically from participants + org type
 * 3. Gatekeeper: classify meeting_type, relevance, org name (AI)
 * 4. Resolve organization
 * 5. Insert meeting (always — no rejection)
 * 6. Link participants
 * 7. Extractor: extract decisions, action items, needs, insights
 * 8. Save extractions to unified table
 * 9. Embed meeting + extractions
 */
export async function processMeeting(input: MeetingInput): Promise<PipelineResult> {
  // Step 1: Classify participants as internal/external
  const classifiedParticipants = await classifyParticipants(input.participants);

  // Step 2: Determine party_type deterministically from participants
  const partyType = determinePartyType(classifiedParticipants);

  // Step 3: Classify meeting with Gatekeeper (meeting_type, relevance, org name)
  const gatekeeperResult = await runGatekeeper(input.summary, {
    title: input.title,
    participants: classifiedParticipants,
    date: input.date,
    topics: input.topics,
  });

  // Step 4: Resolve organization — use known org from participants first, fallback to Gatekeeper
  const knownOrg = classifiedParticipants.find(
    (p) => p.label === "external" && p.organizationName,
  );
  const orgNameToResolve = knownOrg?.organizationName ?? gatekeeperResult.organization_name;
  const orgResult = await resolveOrganization(orgNameToResolve);

  // Step 5a: Build raw_fireflies JSONB (original Fireflies data + pipeline metadata)
  const rawFireflies: Record<string, unknown> = {
    ...(input.raw_fireflies ?? {}),
    pipeline: {
      participant_classification: classifiedParticipants.map((p) => ({
        raw: p.raw,
        label: p.label,
        matched_name: p.matchedName ?? null,
        organization_name: p.organizationName ?? null,
        organization_type: p.organizationType ?? null,
      })),
      party_type_source: knownOrg ? "deterministic" : "gatekeeper_fallback",
      gatekeeper: {
        meeting_type: gatekeeperResult.meeting_type,
        relevance_score: gatekeeperResult.relevance_score,
        reason: gatekeeperResult.reason,
        organization_name: gatekeeperResult.organization_name,
      },
      processed_at: new Date().toISOString(),
    },
  };

  // Step 5b: Insert meeting
  const insertResult = await insertMeeting({
    fireflies_id: input.fireflies_id,
    title: input.title,
    date: new Date(Number(input.date)).toISOString(),
    participants: input.participants,
    summary: input.summary,
    transcript: input.transcript,
    meeting_type: gatekeeperResult.meeting_type,
    party_type: partyType,
    relevance_score: gatekeeperResult.relevance_score,
    organization_id: orgResult.organization_id,
    unmatched_organization_name: orgResult.matched ? null : orgNameToResolve,
    raw_fireflies: rawFireflies,
    embedding_stale: true,
    verification_status: "draft",
  });

  let meetingId: string | null = null;
  if ("error" in insertResult) {
    console.error("Meeting insert error:", insertResult.error);
    return {
      gatekeeper: gatekeeperResult,
      partyType,
      extractor: null,
      meetingId: null,
      extractions_saved: 0,
      embedded: false,
      elevenlabs_transcribed: false,
      errors: [`Meeting insert: ${insertResult.error}`],
    };
  }

  meetingId = insertResult.data.id;

  // Step 5: Link participants
  await matchParticipants(meetingId, input.participants);

  // Step 6: Run Extractor
  let extractorResult: ExtractorOutput | null = null;
  let extractionsSaved = 0;
  let extractorError: string | null = null;

  try {
    extractorResult = await runExtractor(input.transcript, {
      title: input.title,
      meeting_type: gatekeeperResult.meeting_type,
      party_type: partyType,
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

    // Step 7: Save extractions to unified table
    const saveResult = await saveExtractions(extractorResult, meetingId);
    extractionsSaved = saveResult.extractions_saved;

    console.info(
      `Extractor: ${extractionsSaved} extractions saved, project linked: ${saveResult.project_linked}`,
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Extractor failed:", errMsg);
    extractorError = errMsg;
  }

  // Step 8: Embed meeting + extractions for vector search
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

  // Step 9: ElevenLabs Scribe v2 transcription (non-blocking)
  let elevenlabsTranscribed = false;
  let elevenlabsError: string | null = null;

  if (input.audio_url) {
    try {
      console.info("Starting ElevenLabs Scribe v2 transcription...");
      const scribeResult = await transcribeWithElevenLabs(input.audio_url);
      const formattedTranscript = formatScribeTranscript(scribeResult.words);

      const updateResult = await updateMeetingElevenLabs(meetingId, {
        transcript_elevenlabs: formattedTranscript,
        raw_elevenlabs: scribeResult.raw as unknown as Record<string, unknown>,
        audio_url: input.audio_url,
      });

      if ("error" in updateResult) {
        console.error("Failed to save ElevenLabs transcript:", updateResult.error);
        elevenlabsError = updateResult.error;
      } else {
        elevenlabsTranscribed = true;
        console.info(
          `ElevenLabs Scribe v2: transcribed ${scribeResult.words.length} words, ` +
          `language: ${scribeResult.languageCode} (${(scribeResult.languageProbability * 100).toFixed(1)}% confidence)`,
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("ElevenLabs transcription failed (non-blocking):", errMsg);
      elevenlabsError = errMsg;
    }
  }

  const errors: string[] = [];
  if (extractorError) errors.push(`Extractor: ${extractorError}`);
  if (embedError) errors.push(`Embedding: ${embedError}`);
  if (elevenlabsError) errors.push(`ElevenLabs: ${elevenlabsError}`);

  return {
    gatekeeper: gatekeeperResult,
    partyType,
    extractor: extractorResult,
    meetingId,
    extractions_saved: extractionsSaved,
    embedded,
    elevenlabs_transcribed: elevenlabsTranscribed,
    errors,
  };
}
