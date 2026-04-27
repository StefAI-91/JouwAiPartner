"use server";

import {
  runThemeDetector,
  THEME_DETECTOR_SYSTEM_PROMPT,
  THEME_DETECTOR_PROMPT_VERSION,
  THEME_DETECTOR_MODEL,
  type ThemeCatalogEntry,
  type ThemeDetectorNegativeExample,
} from "@repo/ai/agents/theme-detector";
import type { ThemeDetectorOutput } from "@repo/ai/validations/theme-detector";
import { requireAdminInAction } from "@repo/auth/access";
import { getVerifiedMeetingById } from "@repo/database/queries/meetings";
import { listVerifiedThemes } from "@repo/database/queries/themes";
import {
  getMeetingThemesForDevDetector,
  getExtractionThemesForDevDetector,
  type DevDetectorMeetingThemeRow,
  type DevDetectorExtractionThemeRow,
} from "@repo/database/queries/dev-detector";
import { runDevDetectorSchema, type RunDevDetectorInput } from "@/features/themes/validations";

export interface DevDetectorThemeLookup {
  themeId: string;
  name: string;
  emoji: string;
  slug: string;
  description: string;
  matchingGuide: string;
  status: "emerging" | "verified" | "archived";
}

export interface DevDetectorMeetingContext {
  title: string;
  meetingType: string | null;
  partyType: string | null;
  date: string | null;
  summary: string | null;
  transcript: string | null;
  participants: string[];
}

export interface DevDetectorResult {
  detectorOutput: ThemeDetectorOutput;
  inputSummary: {
    meetingId: string;
    title: string;
    themesCount: number;
    negativeExamplesCount: number;
    identifiedProjectsCount: number;
  };
  meetingContext: DevDetectorMeetingContext;
  currentMeetingThemes: DevDetectorMeetingThemeRow[];
  currentExtractionThemes: DevDetectorExtractionThemeRow[];
  themesLookup: DevDetectorThemeLookup[];
  systemPrompt: string;
  model: string;
  promptVersion: string;
}

/**
 * TH-011 (FUNC-279, SEC-230) — Dry-run harness voor de Theme-Detector.
 * Roept `runThemeDetector` direct aan zonder DB-writes (de agent logt
 * alleen telemetrie via withAgentRun — dat is audit, geen productie-state).
 * Admin-only.
 *
 * Input-panel toont identified_projects + meeting context als hint waarom
 * de detector bepaalde keuzes maakt. Output-panel (UI) splitst
 * identified_themes en proposed_themes. Diff-panel vergelijkt fresh
 * detector-output met de huidige `meeting_themes` DB-state.
 */
export async function runDevDetectorAction(
  input: RunDevDetectorInput,
): Promise<DevDetectorResult | { error: string }> {
  const parsed = runDevDetectorSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const meeting = await getVerifiedMeetingById(parsed.data.meetingId);
  if (!meeting) return { error: "Meeting niet gevonden of niet verified" };

  const [themes, currentMeetingThemes, currentExtractionThemes] = await Promise.all([
    listVerifiedThemes({ includeNegativeExamples: true }),
    getMeetingThemesForDevDetector(parsed.data.meetingId),
    getExtractionThemesForDevDetector(parsed.data.meetingId),
  ]);

  const themesCatalog: ThemeCatalogEntry[] = themes.map((t) => ({
    themeId: t.id,
    name: t.name,
    description: t.description,
    matching_guide: t.matching_guide,
  }));

  const negativeExamples: ThemeDetectorNegativeExample[] = themes.flatMap((t) =>
    t.negative_examples.map((n) => ({
      themeId: t.id,
      evidenceQuote: n.evidence_quote,
      reason: n.reason,
    })),
  );

  const participants = meeting.meeting_participants.map((mp) => mp.person.name);

  // Bij regenerate/harness is de Gatekeeper-output niet in memory. Laat
  // identified_projects leeg — de detector valt terug op de summary +
  // matching_guide als arbiter. Dezelfde beperking als
  // regenerateMeetingThemesAction (FUNC-283).
  //
  // MB-2: de harness schrijft géén meeting_themes / extraction_themes weg,
  // maar logt WEL een `agent_runs`-rij + verstookt Anthropic-tokens (want
  // de LLM wordt écht aangeroepen). We taggen de run zodat dashboards
  // deze runs kunnen uitsluiten van productie-metrics.
  const detectorOutput = await runThemeDetector({
    meeting: {
      meetingId: parsed.data.meetingId,
      title: meeting.title ?? "",
      meeting_type: meeting.meeting_type ?? "team_sync",
      party_type: meeting.party_type ?? "internal",
      participants,
      summary: meeting.summary ?? "",
      identified_projects: [],
    },
    themes: themesCatalog,
    negativeExamples,
    telemetryContext: {
      context: "dev-detector-harness",
      dry_run: true,
    },
  });

  return {
    detectorOutput,
    inputSummary: {
      meetingId: parsed.data.meetingId,
      title: meeting.title ?? "",
      themesCount: themes.length,
      negativeExamplesCount: negativeExamples.length,
      identifiedProjectsCount: 0,
    },
    meetingContext: {
      title: meeting.title ?? "",
      meetingType: meeting.meeting_type,
      partyType: meeting.party_type,
      date: meeting.date ?? null,
      summary: meeting.summary ?? null,
      transcript:
        meeting.transcript_elevenlabs_named ??
        meeting.transcript_elevenlabs ??
        meeting.transcript ??
        null,
      participants,
    },
    currentMeetingThemes,
    currentExtractionThemes,
    themesLookup: themes.map((t) => ({
      themeId: t.id,
      name: t.name,
      emoji: t.emoji,
      slug: t.slug,
      description: t.description,
      matchingGuide: t.matching_guide,
      status: t.status,
    })),
    systemPrompt: THEME_DETECTOR_SYSTEM_PROMPT,
    model: THEME_DETECTOR_MODEL,
    promptVersion: THEME_DETECTOR_PROMPT_VERSION,
  };
}
