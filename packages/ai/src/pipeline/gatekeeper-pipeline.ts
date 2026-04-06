import { runGatekeeper } from "../agents/gatekeeper";
import type { ParticipantInfo } from "../agents/gatekeeper";
import type { ExtractorOutput } from "../agents/extractor";
import { GatekeeperOutput } from "../validations/gatekeeper";
import type { PartyType, IdentifiedProject } from "../validations/gatekeeper";
import { insertMeeting } from "@repo/database/mutations/meetings";
import { resolveOrganization } from "./entity-resolution";
import { buildEntityContext } from "./context-injection";
import { findPeopleByEmails } from "@repo/database/queries/people";
import { linkMeetingParticipants } from "@repo/database/mutations/meeting-participants";
import { embedMeetingWithExtractions } from "./embed-pipeline";
import { classifyParticipants, determinePartyType } from "./participant-classifier";
import { buildRawFireflies } from "./build-raw-fireflies";
import { runTranscribeStep } from "./steps/transcribe";
import { runSummarizeStep } from "./steps/summarize";
import { runExtractStep } from "./steps/extract";

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
  identifiedProjects: IdentifiedProject[];
  extractor: ExtractorOutput | null;
  meetingId: string | null;
  extractions_saved: number;
  embedded: boolean;
  elevenlabs_transcribed: boolean;
  summarized: boolean;
  errors: string[];
}

/**
 * Full meeting processing pipeline:
 * 1. Classify participants as internal/external
 * 2. Determine party_type deterministically
 * 3. Gatekeeper: classify meeting_type, relevance, org name (AI)
 * 4. Resolve organization
 * 5. Build metadata + insert meeting
 * 6. Link participants
 * 7. ElevenLabs transcription (non-blocking)
 * 8. Summarizer: rich AI summary
 * 9. Extractor: extract decisions, action items, needs, insights
 * 10. Embed meeting + extractions
 */
export async function processMeeting(input: MeetingInput): Promise<PipelineResult> {
  const errors: string[] = [];

  // Step 1-2: Classify participants and determine party type + fetch entity context (parallel)
  const [classifiedParticipants, entityContext] = await Promise.all([
    classifyParticipants(input.participants),
    buildEntityContext(),
  ]);
  const partyType = determinePartyType(classifiedParticipants);

  // Step 3: Classify meeting with Gatekeeper AI (with entity context for project identification)
  const gatekeeperResult = await runGatekeeper(input.summary, {
    title: input.title,
    participants: classifiedParticipants,
    date: input.date,
    topics: input.topics,
    entityContext: entityContext.contextString,
  });

  const identifiedProjects = gatekeeperResult.identified_projects;

  // Step 4: Resolve organization
  const knownOrg = classifiedParticipants.find((p) => p.label === "external" && p.organizationName);
  const orgNameToResolve = knownOrg?.organizationName ?? gatekeeperResult.organization_name;
  const orgResult = await resolveOrganization(orgNameToResolve);

  // Step 5a: Build metadata
  const partyTypeSource = knownOrg ? "deterministic" : "gatekeeper_fallback";
  const rawFireflies = buildRawFireflies(
    input.raw_fireflies,
    classifiedParticipants,
    gatekeeperResult,
    partyTypeSource,
  );

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

  if ("error" in insertResult) {
    console.error("Meeting insert error:", insertResult.error);
    return {
      gatekeeper: gatekeeperResult,
      partyType,
      identifiedProjects,
      extractor: null,
      meetingId: null,
      extractions_saved: 0,
      embedded: false,
      elevenlabs_transcribed: false,
      summarized: false,
      errors: [`Meeting insert: ${insertResult.error}`],
    };
  }

  const meetingId = insertResult.data.id;

  // Step 6: Link participants
  await matchParticipants(meetingId, input.participants);

  // Step 7: ElevenLabs transcription
  const transcribeResult = await runTranscribeStep(meetingId, input.audio_url);
  if (transcribeResult.error) errors.push(`ElevenLabs: ${transcribeResult.error}`);

  // Step 8: Summarizer
  const bestTranscript = transcribeResult.transcript ?? input.transcript;
  const transcriptSource = transcribeResult.transcript ? "elevenlabs" : "fireflies";

  const summarizeContext = {
    title: input.title,
    meeting_type: gatekeeperResult.meeting_type,
    party_type: partyType,
    participants: input.participants,
  };
  console.info(`Summarizer using ${transcriptSource} transcript`);
  const summarizeResult = await runSummarizeStep(meetingId, bestTranscript, summarizeContext);
  if (summarizeResult.error) errors.push(`Summarizer: ${summarizeResult.error}`);

  // Step 9: Extractor
  const extractorSummary = summarizeResult.richSummary ?? input.summary;
  console.info(`Extractor using ${transcriptSource} transcript`);
  const extractResult = await runExtractStep(
    meetingId,
    bestTranscript,
    { ...summarizeContext, summary: extractorSummary },
    rawFireflies,
    transcriptSource,
  );
  if (extractResult.error) errors.push(`Extractor: ${extractResult.error}`);

  // Step 10: Embed meeting + extractions
  let embedded = false;
  try {
    await embedMeetingWithExtractions(meetingId);
    embedded = true;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Embedding failed:", errMsg);
    errors.push(`Embedding: ${errMsg}`);
  }

  return {
    gatekeeper: gatekeeperResult,
    partyType,
    identifiedProjects,
    extractor: extractResult.extractorOutput,
    meetingId,
    extractions_saved: extractResult.extractionsSaved,
    embedded,
    elevenlabs_transcribed: transcribeResult.success,
    summarized: summarizeResult.success,
    errors,
  };
}
