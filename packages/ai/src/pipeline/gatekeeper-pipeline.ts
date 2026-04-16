import { runGatekeeper } from "../agents/gatekeeper";
import type { ParticipantInfo } from "../agents/gatekeeper";
import type { ExtractorOutput } from "../agents/extractor";
import { GatekeeperOutput } from "../validations/gatekeeper";
import type { PartyType, IdentifiedProject } from "../validations/gatekeeper";
import { insertMeeting } from "@repo/database/mutations/meetings";
import { resolveOrganization } from "./entity-resolution";
import { buildEntityContext } from "./context-injection";
import { findPeopleByEmails, getAllKnownPeople } from "@repo/database/queries/people";
import { linkMeetingParticipants } from "@repo/database/mutations/meeting-participants";
import { embedMeetingWithExtractions } from "./embed-pipeline";
import {
  classifyParticipantsWithCache,
  determinePartyType,
  determineRuleBasedMeetingType,
} from "./participant-classifier";
import { buildRawFireflies } from "./build-raw-fireflies";
import { runTranscribeStep } from "./steps/transcribe";
import { runSummarizeStep } from "./steps/summarize";
import { runExtractStep } from "./steps/extract";
import { runTagger } from "./tagger";
import { buildSegments } from "./segment-builder";
import { embedBatch } from "../embeddings";
import { insertMeetingProjectSummaries } from "@repo/database/mutations/meeting-project-summaries";
import { updateSegmentEmbedding } from "@repo/database/mutations/meeting-project-summaries";
import { getIgnoredEntityNames } from "@repo/database/queries/ignored-entities";
import { extractSpeakerNames, buildSpeakerMap, formatSpeakerContext } from "./speaker-map";
import type { SpeakerMap } from "./speaker-map";
import { generateMeetingTitle } from "./generate-title";
import { updateMeetingTitle } from "@repo/database/mutations/meetings";

interface MeetingAttendee {
  displayName: string;
  email: string;
  name: string;
}

interface MeetingInput {
  fireflies_id: string;
  title: string;
  date: string;
  participants: string[];
  organizer_email?: string | null;
  meeting_attendees?: MeetingAttendee[];
  /** Fireflies sentences with speaker names (used for speaker mapping) */
  sentences?: { speaker_name: string }[];
  summary: string;
  topics: string[];
  transcript: string;
  raw_fireflies?: Record<string, unknown>;
  audio_url?: string;
}

/**
 * Collect all unique participant emails from both participants array and
 * structured meeting_attendees (which provides more reliable email data).
 */
function collectParticipantEmails(participants: string[], attendees?: MeetingAttendee[]): string[] {
  const emailSet = new Set<string>();

  // Emails from participants array (legacy, sometimes unreliable)
  for (const p of participants) {
    const normalized = p.toLowerCase().trim();
    if (normalized.includes("@")) emailSet.add(normalized);
  }

  // Emails from structured meeting_attendees (more reliable)
  if (attendees) {
    for (const a of attendees) {
      if (a.email) emailSet.add(a.email.toLowerCase().trim());
    }
  }

  return [...emailSet];
}

/**
 * Match participant emails and speaker names to known people and link them to the meeting.
 * Uses meeting_attendees emails when available for more reliable matching.
 * Also matches speaker names from the speaker map (name-based matching).
 */
async function matchParticipants(
  meetingId: string,
  participants: string[],
  attendees?: MeetingAttendee[],
  speakerMap?: SpeakerMap,
): Promise<number> {
  const personIdSet = new Set<string>();

  // Match by email
  const emails = collectParticipantEmails(participants, attendees);
  if (emails.length > 0) {
    const emailToPersonId = await findPeopleByEmails(emails);
    for (const id of emailToPersonId.values()) personIdSet.add(id);
  }

  // Match by speaker name (from speaker map)
  if (speakerMap) {
    for (const info of speakerMap.values()) {
      if (info.personId) personIdSet.add(info.personId);
    }
  }

  if (personIdSet.size === 0) return 0;

  const result = await linkMeetingParticipants(meetingId, [...personIdSet]);
  if ("error" in result) {
    console.error("Failed to link participants:", result.error);
    return 0;
  }
  return result.linked;
}

/**
 * Merge participants array with structured meeting_attendees to get
 * a more complete list of participant identifiers for classification.
 * Attendee emails are preferred as they're more reliable than the
 * raw participants strings.
 */
function mergeParticipantSources(participants: string[], attendees?: MeetingAttendee[]): string[] {
  const seen = new Set(participants.map((p) => p.toLowerCase().trim()));
  const merged = [...participants];

  if (attendees) {
    for (const a of attendees) {
      const email = a.email?.toLowerCase().trim();
      if (email && !seen.has(email)) {
        merged.push(email);
        seen.add(email);
      }
    }
  }

  return merged;
}

interface PipelineResult {
  gatekeeper: GatekeeperOutput;
  partyType: PartyType;
  identifiedProjects: IdentifiedProject[];
  extractor: ExtractorOutput | null;
  meetingId: string | null;
  extractions_saved: number;
  segments_saved: number;
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

  // Step 1-2: Classify participants, build speaker map, fetch entity context (parallel)
  // Merge meeting_attendees emails into participants for better classification
  const allParticipantStrings = mergeParticipantSources(
    input.participants,
    input.meeting_attendees,
  );
  const [knownPeople, entityContext] = await Promise.all([
    getAllKnownPeople(),
    buildEntityContext(),
  ]);
  const classifiedParticipants = classifyParticipantsWithCache(allParticipantStrings, knownPeople);

  // Build speaker map from Fireflies sentence speaker names (reuse knownPeople)
  const speakerNames = input.sentences ? extractSpeakerNames(input.sentences) : [];
  const speakerMap = buildSpeakerMap(speakerNames, knownPeople);
  const speakerContext = speakerMap.size > 0 ? formatSpeakerContext(speakerMap) : null;

  // Step 3: Classify meeting with Gatekeeper AI (with entity context for project identification)
  // Merge speaker map info into classified participants for richer gatekeeper context.
  // Sprint 035: isAdmin doorgeven zodat board-detectie consistent is tussen de
  // gatekeeper-context en de deterministische override.
  const adminIds = new Set(knownPeople.filter((p) => p.is_admin).map((p) => p.id));
  const gatekeeperParticipants: ParticipantInfo[] =
    speakerMap.size > 0
      ? [...speakerMap.values()].map((s) => ({
          raw: s.raw,
          label: s.label,
          matchedName: s.name !== s.raw ? s.name : undefined,
          organizationName: s.organizationName,
          isAdmin: s.personId ? adminIds.has(s.personId) : false,
        }))
      : classifiedParticipants;

  const gatekeeperResult = await runGatekeeper(input.summary, {
    title: input.title,
    participants: gatekeeperParticipants,
    date: input.date,
    topics: input.topics,
    entityContext: entityContext.contextString,
  });

  // Rule-based meeting type: deterministic rules override AI when possible.
  // Gatekeeper still runs for relevance_score and project identification.
  const ruleBasedType = determineRuleBasedMeetingType(classifiedParticipants);
  const finalMeetingType = ruleBasedType ?? gatekeeperResult.meeting_type;

  // Party type: uses final meeting type for better classification
  const partyType = determinePartyType(classifiedParticipants, finalMeetingType);

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

  // Add rule-based classification to audit trail
  const pipelineAudit = rawFireflies.pipeline as Record<string, unknown>;
  pipelineAudit.rule_based_meeting_type = ruleBasedType;
  pipelineAudit.meeting_type_source = ruleBasedType ? "deterministic" : "gatekeeper";

  // Add speaker map to pipeline audit trail
  if (speakerMap.size > 0) {
    const pipelineData = rawFireflies.pipeline as Record<string, unknown>;
    pipelineData.speaker_map = [...speakerMap.values()].map((s) => ({
      raw: s.raw,
      name: s.name,
      person_id: s.personId,
      label: s.label,
      role: s.role,
      organization_name: s.organizationName,
    }));
  }

  // Step 5b: Insert meeting
  const insertResult = await insertMeeting({
    fireflies_id: input.fireflies_id,
    title: input.title,
    original_title: input.title,
    date: new Date(Number(input.date)).toISOString(),
    participants: input.participants,
    summary: input.summary,
    transcript: input.transcript,
    meeting_type: finalMeetingType,
    party_type: partyType,
    relevance_score: gatekeeperResult.relevance_score,
    organization_id: orgResult.organization_id,
    unmatched_organization_name: orgResult.matched ? null : orgNameToResolve,
    raw_fireflies: rawFireflies,
    embedding_stale: true,
    verification_status: "draft",
    organizer_email: input.organizer_email ?? null,
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
      segments_saved: 0,
      embedded: false,
      elevenlabs_transcribed: false,
      summarized: false,
      errors: [`Meeting insert: ${insertResult.error}`],
    };
  }

  const meetingId = insertResult.data.id;

  // Step 6: Link participants (uses emails + speaker name matching)
  await matchParticipants(meetingId, input.participants, input.meeting_attendees, speakerMap);

  // Step 7: ElevenLabs transcription
  const transcribeResult = await runTranscribeStep(meetingId, input.audio_url);
  if (transcribeResult.error) errors.push(`ElevenLabs: ${transcribeResult.error}`);

  // Step 8: Summarizer
  const bestTranscript = transcribeResult.transcript ?? input.transcript;
  const transcriptSource = transcribeResult.transcript ? "elevenlabs" : "fireflies";

  const summarizeContext = {
    title: input.title,
    meeting_type: finalMeetingType,
    party_type: partyType,
    participants: input.participants,
    speakerContext,
    entityContext: entityContext.contextString,
  };
  console.info(`Summarizer using ${transcriptSource} transcript`);
  const summarizeResult = await runSummarizeStep(meetingId, bestTranscript, summarizeContext);
  if (summarizeResult.error) errors.push(`Summarizer: ${summarizeResult.error}`);

  // Step 8a: AI title generation — uses rich summary for better subject extraction
  try {
    const firstProject = identifiedProjects.find((p) => p.project_id !== null);
    const projectName = firstProject
      ? (entityContext.projects.find((p) => p.id === firstProject.project_id)?.name ?? null)
      : null;

    const titleSummary = summarizeResult.richSummary ?? input.summary;
    const generatedTitle = await generateMeetingTitle(titleSummary, {
      meetingType: finalMeetingType,
      partyType,
      organizationName: orgResult.matched
        ? (knownOrg?.organizationName ?? gatekeeperResult.organization_name)
        : (gatekeeperResult.organization_name ?? null),
      projectName,
    });

    await updateMeetingTitle(meetingId, generatedTitle);
    console.info(`Title generated: ${generatedTitle}`);
  } catch (titleErr) {
    const msg = titleErr instanceof Error ? titleErr.message : String(titleErr);
    console.error("Title generation failed (non-blocking):", msg);
    errors.push(`Title generation: ${msg}`);
  }

  // Step 8b: Tagger + Segment-bouw (RULE-015: error boundary, graceful degradation)
  let segmentsSaved = 0;
  if (summarizeResult.kernpunten.length > 0 || summarizeResult.vervolgstappen.length > 0) {
    try {
      // Fetch ignored entity names for this meeting's organization
      const orgId = orgResult.organization_id;
      const ignoredNames = orgId
        ? await getIgnoredEntityNames(orgId, "project")
        : new Set<string>();

      const taggerOutput = runTagger({
        kernpunten: summarizeResult.kernpunten,
        vervolgstappen: summarizeResult.vervolgstappen,
        identified_projects: identifiedProjects,
        knownProjects: entityContext.projects.map((p) => ({
          id: p.id,
          name: p.name,
          aliases: p.aliases,
        })),
        ignoredNames,
      });

      const segments = buildSegments(taggerOutput);

      if (segments.length > 0) {
        // Insert segments first (without embeddings)
        const segmentRows = segments.map((s) => ({
          meeting_id: meetingId,
          project_id: s.project_id,
          project_name_raw: s.project_name_raw,
          kernpunten: s.kernpunten,
          vervolgstappen: s.vervolgstappen,
          summary_text: s.summary_text,
        }));

        const insertSegResult = await insertMeetingProjectSummaries(segmentRows);
        if ("error" in insertSegResult) {
          errors.push(`Segments insert: ${insertSegResult.error}`);
        } else {
          segmentsSaved = insertSegResult.ids.length;

          // Embed all segments in a single batch call (FUNC-054)
          try {
            const texts = segments.map((s) => s.summary_text);
            const embeddings = await embedBatch(texts);

            // Update embeddings in parallel
            await Promise.all(
              insertSegResult.ids.map((id, i) => updateSegmentEmbedding(id, embeddings[i])),
            );
          } catch (embedErr) {
            const msg = embedErr instanceof Error ? embedErr.message : String(embedErr);
            console.error("Segment embedding failed (non-blocking):", msg);
            errors.push(`Segment embedding: ${msg}`);
          }
        }
      }

      console.info(`Tagger: ${segmentsSaved} segments saved for meeting ${meetingId}`);
    } catch (taggerErr) {
      // RULE-015: Graceful degradation — log error, pipeline continues
      const msg = taggerErr instanceof Error ? taggerErr.message : String(taggerErr);
      console.error("Tagger failed (graceful degradation):", msg);
      errors.push(`Tagger: ${msg}`);
    }
  }

  // Step 9: Extractor
  const extractorSummary = summarizeResult.richSummary ?? input.summary;
  console.info(`Extractor using ${transcriptSource} transcript`);
  const extractResult = await runExtractStep(
    meetingId,
    bestTranscript,
    { ...summarizeContext, summary: extractorSummary, meeting_date: input.date },
    rawFireflies,
    transcriptSource,
    identifiedProjects,
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
    segments_saved: segmentsSaved,
    embedded,
    elevenlabs_transcribed: transcribeResult.success,
    summarized: summarizeResult.success,
    errors,
  };
}
