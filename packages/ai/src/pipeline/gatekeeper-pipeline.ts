import { runGatekeeper } from "../agents/gatekeeper";
import type { ParticipantInfo } from "../agents/gatekeeper";
import { GatekeeperOutput } from "../validations/gatekeeper";
import type { PartyType, IdentifiedProject } from "../validations/gatekeeper";
import { insertMeeting } from "@repo/database/mutations/meetings";
import { resolveOrganization } from "./entity-resolution";
import { buildEntityContext } from "./context-injection";
import { getAllKnownPeople } from "@repo/database/queries/people";
import {
  classifyParticipantsWithCache,
  determinePartyType,
  determineRuleBasedMeetingType,
} from "./participant/classifier";
import { buildRawFireflies } from "./build-raw-fireflies";
import { runTranscribeStep } from "./steps/transcribe";
import { runSpeakerMappingStep } from "./steps/speaker-mapping";
import { runSummarizeStep } from "./steps/summarize";
import { runRiskSpecialistStep } from "./steps/risk-specialist";
import {
  runActionItemSpecialistStep,
  buildActionItemParticipants,
} from "./steps/action-item-specialist";
import { runGenerateTitleStep } from "./steps/generate-title";
import { runTagAndSegmentStep } from "./steps/tag-and-segment";
import { runEmbedStep } from "./steps/embed";
import { runThemeDetectorStep } from "./steps/theme-detector";
import { runLinkThemesStep } from "./steps/link-themes";
import { extractSpeakerNames, buildSpeakerMap, formatSpeakerContext } from "./speaker-map";
import {
  matchParticipants,
  mergeParticipantSources,
  type MeetingAttendee,
} from "./participant/helpers";

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

interface PipelineResult {
  gatekeeper: GatekeeperOutput;
  partyType: PartyType;
  identifiedProjects: IdentifiedProject[];
  meetingId: string | null;
  extractions_saved: number;
  segments_saved: number;
  embedded: boolean;
  elevenlabs_transcribed: boolean;
  summarized: boolean;
  themes_tagged: number;
  themes_proposals: number;
  errors: string[];
}

/**
 * Theme-Detector skip-drempel: meetings met een `relevance_score` onder deze
 * waarde worden niet door de Theme-Detector + link-themes flow gehaald
 * (TH-011 FUNC-276, was TH-003 FUNC-211). Zelfde drempel als de
 * email-filter-gatekeeper gebruikt voor ruis-emails.
 */
const THEME_DETECTOR_MIN_RELEVANCE = 0.4;

/**
 * Full meeting processing pipeline:
 * 1. Classify participants as internal/external
 * 2. Determine party_type deterministically
 * 3. Gatekeeper: classify meeting_type, relevance, org name (AI)
 * 4. Resolve organization
 * 5. Build metadata + insert meeting
 * 6. Link participants
 * 7. ElevenLabs transcription (non-blocking)
 * 8. Summarize (structurer of legacy summarizer) + RiskSpecialist (parallel,
 *    risks naar `extractions`-tabel zodat ze zichtbaar zijn in de review-flow)
 * 9. AI title generation
 * 10. Tagger + segments
 * 11. Embed meeting + extractions
 */
export async function processMeeting(input: MeetingInput): Promise<PipelineResult> {
  const errors: string[] = [];

  // Step 1-2: Classify participants, build speaker map, fetch entity context (parallel)
  const allParticipantStrings = mergeParticipantSources(
    input.participants,
    input.meeting_attendees,
  );
  const [knownPeople, entityContext] = await Promise.all([
    getAllKnownPeople(),
    buildEntityContext(),
  ]);
  const classifiedParticipants = classifyParticipantsWithCache(allParticipantStrings, knownPeople);

  const speakerNames = input.sentences ? extractSpeakerNames(input.sentences) : [];
  const speakerMap = buildSpeakerMap(speakerNames, knownPeople);
  const speakerContext = speakerMap.size > 0 ? formatSpeakerContext(speakerMap) : null;

  // Step 3: Gatekeeper classification — board-detectie via admin-vlag is
  // consistent met de deterministische override.
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

  const ruleBasedType = determineRuleBasedMeetingType(classifiedParticipants);
  const finalMeetingType = ruleBasedType ?? gatekeeperResult.meeting_type;
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

  const pipelineAudit = rawFireflies.pipeline as Record<string, unknown>;
  pipelineAudit.rule_based_meeting_type = ruleBasedType;
  pipelineAudit.meeting_type_source = ruleBasedType ? "deterministic" : "gatekeeper";

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
      meetingId: null,
      extractions_saved: 0,
      segments_saved: 0,
      embedded: false,
      elevenlabs_transcribed: false,
      summarized: false,
      themes_tagged: 0,
      themes_proposals: 0,
      errors: [`Meeting insert: ${insertResult.error}`],
    };
  }

  const meetingId = insertResult.data.id;

  // Step 6: Link participants
  await matchParticipants(meetingId, input.participants, input.meeting_attendees, speakerMap);

  // Step 7: ElevenLabs transcription
  const transcribeResult = await runTranscribeStep(meetingId, input.audio_url);
  if (transcribeResult.error) errors.push(`ElevenLabs: ${transcribeResult.error}`);

  // Step 7b: Speaker-mapping — vervang anonieme `[speaker_X]:`-labels door
  // deelnemer-namen via Haiku-call. Niet-blokkerend; bij falen valt iedereen
  // terug op de raw transcript_elevenlabs.
  let namedTranscript: string | null = null;
  if (transcribeResult.transcript) {
    const speakerMappingResult = await runSpeakerMappingStep({
      meetingId,
      elevenLabsTranscript: transcribeResult.transcript,
      firefliesTranscript: input.transcript,
    });
    if (speakerMappingResult.error) errors.push(`Speaker-mapping: ${speakerMappingResult.error}`);
    namedTranscript = speakerMappingResult.named_transcript;
  }

  // Step 7.5 (TH-011): Theme-Detector — blocking, draait na Gatekeeper en
  // vóór Summarizer + RiskSpecialist. Skip onder de relevance-drempel
  // (zelfde drempel als de oude ThemeTagger).
  const shouldDetectThemes = gatekeeperResult.relevance_score >= THEME_DETECTOR_MIN_RELEVANCE;
  const themeDetectorResult = shouldDetectThemes
    ? await runThemeDetectorStep({
        meeting: {
          meetingId,
          title: input.title,
          meeting_type: finalMeetingType,
          party_type: partyType,
          participants: input.participants,
          summary: input.summary,
          identifiedProjects: identifiedProjects.map((p) => ({
            project_name: p.project_name,
            project_id: p.project_id,
          })),
        },
      })
    : {
        success: true,
        output: { identified_themes: [], proposed_themes: [] },
        themes_considered: 0,
        verifiedThemes: [],
        error: null,
      };
  if (themeDetectorResult.error) errors.push(`ThemeDetector: ${themeDetectorResult.error}`);

  // MB-1: hergebruik de verifiedThemes uit de detector-step zodat we
  // geen tweede DB-call hoeven voor het name/description-mapping.
  const detectorIdentifiedThemeIds = new Set(
    themeDetectorResult.output.identified_themes.map((t) => t.themeId),
  );
  // TH-013 — Summarizer krijgt ook `themeId` (UUID) mee zodat hij die in
  // `theme_summaries[i].themeId` kan terugteruggeven. RiskSpecialist heeft
  // die niet nodig (werkt alleen met namen voor risk-annotaties).
  const identifiedThemesForSummarizer: { themeId: string; name: string; description: string }[] =
    detectorIdentifiedThemeIds.size > 0
      ? themeDetectorResult.verifiedThemes
          .filter((t) => detectorIdentifiedThemeIds.has(t.id))
          .map((t) => ({ themeId: t.id, name: t.name, description: t.description }))
      : [];

  const identifiedThemesForRisk: { name: string; description: string }[] =
    identifiedThemesForSummarizer.map((t) => ({ name: t.name, description: t.description }));

  // Step 8: Summarize + extract — structurer of legacy pair
  const bestTranscript = namedTranscript ?? transcribeResult.transcript ?? input.transcript;
  const transcriptSource = namedTranscript
    ? "elevenlabs_named"
    : transcribeResult.transcript
      ? "elevenlabs"
      : "fireflies";

  const summarizeContext = {
    title: input.title,
    meeting_type: finalMeetingType,
    party_type: partyType,
    participants: input.participants,
    speakerContext,
    entityContext: entityContext.contextString,
    identified_themes: identifiedThemesForSummarizer,
  };

  // RiskSpecialist draait parallel aan de hoofdpipeline en schrijft naar
  // zowel `extractions` (UI) als `experimental_risk_extractions` (audit).
  // Start nu, await aan het einde.
  const riskSpecialistPromise = runRiskSpecialistStep(
    meetingId,
    bestTranscript,
    {
      title: input.title,
      meeting_type: finalMeetingType,
      party_type: partyType,
      participants: input.participants,
      speakerContext,
      entityContext: entityContext.contextString,
      meeting_date: input.date,
      identified_projects: identifiedProjects.map((p) => ({
        project_name: p.project_name,
        project_id: p.project_id,
      })),
      identified_themes: identifiedThemesForRisk,
    },
    identifiedProjects,
  );

  // ActionItemSpecialist draait parallel aan de hoofdpipeline. Bewust op
  // input.transcript (Fireflies), NIET bestTranscript — de specialist matcht
  // op letterlijke source_quote en speaker-mapping introduceert drift in
  // named-transcripts. Zie sprint 041 + docs/stand-van-zaken.md regels
  // 95 + 159 + 165. Heroverwegen wanneer speaker-mapping ≥95% naam-
  // attributie haalt over een grotere batch.
  const actionItemMeetingDate = new Date(Number(input.date)).toISOString().slice(0, 10);
  const actionItemSpecialistPromise = runActionItemSpecialistStep(
    meetingId,
    input.transcript,
    {
      title: input.title,
      meeting_type: finalMeetingType,
      party_type: partyType,
      meeting_date: actionItemMeetingDate,
      participants: buildActionItemParticipants(input.participants, knownPeople),
    },
    identifiedProjects,
  );

  console.info(`Summarizer using ${transcriptSource} transcript`);
  const summarizeResult = await runSummarizeStep(meetingId, bestTranscript, summarizeContext);
  if (summarizeResult.error) errors.push(`Summarizer: ${summarizeResult.error}`);
  const summarized = summarizeResult.success;
  const richSummary: string | null = summarizeResult.richSummary;
  const kernpuntenForTagger: string[] = summarizeResult.kernpunten;
  const vervolgstappenForTagger: string[] = summarizeResult.vervolgstappen;
  const extractionsSaved = 0;

  // Step 9: AI title generation
  const titleResult = await runGenerateTitleStep({
    meetingId,
    richSummary,
    fallbackSummary: input.summary,
    meetingType: finalMeetingType,
    partyType,
    organizationName: orgResult.matched
      ? (knownOrg?.organizationName ?? gatekeeperResult.organization_name)
      : (gatekeeperResult.organization_name ?? null),
    projects: entityContext.projects.map((p) => ({ id: p.id, name: p.name })),
    identifiedProjects,
  });
  if (titleResult.error) errors.push(`Title generation: ${titleResult.error}`);

  // Step 10: Tagger + segments
  const tagResult = await runTagAndSegmentStep({
    meetingId,
    organizationId: orgResult.organization_id,
    kernpunten: kernpuntenForTagger,
    vervolgstappen: vervolgstappenForTagger,
    identifiedProjects,
    knownProjects: entityContext.projects.map((p) => ({
      id: p.id,
      name: p.name,
      aliases: p.aliases,
    })),
  });
  errors.push(...tagResult.errors);
  const segmentsSaved = tagResult.segmentsSaved;

  // Step 11a (TH-011 FUNC-284 + sprint 041): await beide specialists zodat
  // alle extractions — inclusief risks en action_items — zijn weggeschreven
  // voordat link-themes de extraction.content parset op [Themes:] annotaties
  // en voordat embed (11c) ze oppikt. Beide steps zijn never-throws, dus
  // Promise.all is veilig.
  await Promise.all([riskSpecialistPromise, actionItemSpecialistPromise]);

  // Step 11b: link-themes draait parallel aan embed-save. Skip bij lage
  // relevance_score (FUNC-276) — detector is in step 7.5 ook al
  // overgeslagen, dus output is leeg en link zou niks doen. Never-throws.
  const linkThemesPromise = shouldDetectThemes
    ? runLinkThemesStep({
        meetingId,
        detectorOutput: themeDetectorResult.output,
        kernpunten: kernpuntenForTagger,
        vervolgstappen: vervolgstappenForTagger,
        // MB-1: verified-themes-lijst die de Detector al ophaalde.
        verifiedThemes: themeDetectorResult.verifiedThemes,
        // TH-013 (FUNC-292): Summarizer's per-theme markdown wint boven
        // Detector's 1-2 zins summary. Leeg bij Summarizer-failure → link-
        // themes fallt automatisch terug op Detector-output.
        summarizerThemeSummaries: summarizeResult.themeSummaries,
      })
    : Promise.resolve({
        success: true,
        matches_saved: 0,
        proposals_saved: 0,
        extraction_matches_saved: 0,
        themes_considered: 0,
        error: null,
        skipped: "low_relevance",
      } as const);

  // Step 11c: Embed meeting + extractions — parallel met link-themes
  const embedResult = await runEmbedStep(meetingId);
  if (embedResult.error) errors.push(`Embedding: ${embedResult.error}`);

  const linkThemesResult = await linkThemesPromise;
  if (linkThemesResult.error) errors.push(`LinkThemes: ${linkThemesResult.error}`);

  return {
    gatekeeper: gatekeeperResult,
    partyType,
    identifiedProjects,
    meetingId,
    extractions_saved: extractionsSaved,
    segments_saved: segmentsSaved,
    embedded: embedResult.success,
    elevenlabs_transcribed: transcribeResult.success,
    summarized,
    themes_tagged: linkThemesResult.matches_saved,
    themes_proposals: linkThemesResult.proposals_saved,
    errors,
  };
}
