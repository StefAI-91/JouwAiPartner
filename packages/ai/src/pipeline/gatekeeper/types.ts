import type { GatekeeperOutput, PartyType, IdentifiedProject } from "../../validations/gatekeeper";
import type { ParticipantInfo } from "../../agents/gatekeeper";
import type { ThemeDetectorOutput } from "../../validations/theme-detector";
import type { EntityContext } from "../lib/context-injection";
import type { SpeakerMap } from "../lib/speaker-map";
import type { MeetingAttendee } from "../participant/helpers";
import type { KnownPerson } from "@repo/database/queries/people";
import type { ThemeWithNegativeExamples } from "@repo/database/queries/themes";
import type { SummarizeResult as SummarizeStepResult } from "../steps/summarize";
import type { runRiskSpecialistStep } from "../steps/risk-specialist";
import type { runActionItemSpecialistStep } from "../steps/action-item-specialist";

export interface MeetingInput {
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

export interface PipelineResult {
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
 * Output van de classify-fase: alle context die volgende fases nodig hebben
 * over de deelnemers, gatekeeper-uitkomst en gederiveerde meta-velden.
 */
export interface ClassifyResult {
  classifiedParticipants: ParticipantInfo[];
  knownPeople: KnownPerson[];
  speakerMap: SpeakerMap;
  speakerContext: string | null;
  entityContext: EntityContext;
  gatekeeperResult: GatekeeperOutput;
  finalMeetingType: GatekeeperOutput["meeting_type"];
  ruleBasedType: GatekeeperOutput["meeting_type"] | null;
  partyType: PartyType;
  identifiedProjects: IdentifiedProject[];
}

/**
 * Output van de persist-fase: de DB-id van de aangemaakte meeting plus de
 * naam-resolutie van de organisatie (door volgende fases gebruikt voor
 * title-generation).
 */
export interface PersistResult {
  meetingId: string;
  organizationId: string | null;
  organizationMatched: boolean;
  orgNameToResolve: string | null;
  knownOrgName: string | null;
}

/**
 * Output van de transcribe-fase: de beste transcript-bron voor downstream
 * agents en een audit-flag of ElevenLabs ge-transcribeerd heeft.
 */
export interface TranscribePhaseResult {
  bestTranscript: string;
  transcriptSource: "fireflies" | "elevenlabs" | "elevenlabs_named";
  elevenLabsTranscribed: boolean;
}

/**
 * Output van de detect-themes-fase: detector-output plus de mapping naar
 * naam/description die summarizer + risk-specialist consumen.
 */
export interface DetectThemesResult {
  detectorOutput: ThemeDetectorOutput;
  verifiedThemes: ThemeWithNegativeExamples[];
  identifiedThemesForSummarizer: { themeId: string; name: string; description: string }[];
  identifiedThemesForRisk: { name: string; description: string }[];
  shouldDetectThemes: boolean;
}

/**
 * Output van de extract-fase: summarize + parallel-launched specialists.
 * `riskSpecialistPromise` en `actionItemSpecialistPromise` worden in de
 * finalize-fase ge-await voordat link-themes de extractions kan parsen.
 */
export interface ExtractResult {
  summarized: boolean;
  richSummary: string | null;
  kernpunten: string[];
  vervolgstappen: string[];
  themeSummaries: SummarizeStepResult["themeSummaries"];
  riskSpecialistPromise: ReturnType<typeof runRiskSpecialistStep>;
  actionItemSpecialistPromise: ReturnType<typeof runActionItemSpecialistStep>;
}
