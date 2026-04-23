"use server";

import {
  tagMeetingThemes,
  THEME_TAGGER_SYSTEM_PROMPT,
  type TagMeetingThemesInput,
  type ThemeContext,
  type NegativeExample,
} from "@repo/ai/agents/theme-tagger";
import { TAGGER_EXTRACTION_TYPES, type ThemeTaggerOutput } from "@repo/ai/validations/theme-tagger";
import { requireAdminInAction } from "@repo/auth/access";
import { getVerifiedMeetingById, getMeetingExtractions } from "@repo/database/queries/meetings";
import { listVerifiedThemes } from "@repo/database/queries/themes";
import {
  getMeetingThemesForDevTagger,
  getExtractionThemesForDevTagger,
  type DevTaggerMeetingThemeRow,
  type DevTaggerExtractionThemeRow,
} from "@repo/database/queries/dev-tagger";
import { runDevTaggerSchema, type RunDevTaggerInput } from "@/validations/themes";

const TAGGER_TYPES: ReadonlySet<string> = new Set(TAGGER_EXTRACTION_TYPES);

export interface DevTaggerThemeLookup {
  themeId: string;
  name: string;
  emoji: string;
  slug: string;
  status: "emerging" | "verified" | "archived";
}

export interface DevTaggerResult {
  taggerOutput: ThemeTaggerOutput;
  inputSummary: {
    meetingId: string;
    title: string;
    extractionsTotal: number;
    extractionsAfterTypeFilter: number;
    themesCount: number;
    negativeExamplesCount: number;
  };
  currentMeetingThemes: DevTaggerMeetingThemeRow[];
  currentExtractionThemes: DevTaggerExtractionThemeRow[];
  inputExtractions: { id: string; type: string; content: string }[];
  themesLookup: DevTaggerThemeLookup[];
  systemPrompt: string;
}

/**
 * TH-010 (FUNC-260, SEC-220) — Dry-run harness voor de ThemeTagger. Laadt
 * dezelfde inputs als `runTagThemesStep` maar roept `tagMeetingThemes` direct
 * aan zonder ook maar iets naar de DB te schrijven. Admin-only. Input vs.
 * output wordt in de UI diff-berekend (UI-321).
 */
export async function runDevTaggerAction(
  input: RunDevTaggerInput,
): Promise<DevTaggerResult | { error: string }> {
  const parsed = runDevTaggerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const meeting = await getVerifiedMeetingById(parsed.data.meetingId);
  if (!meeting) return { error: "Meeting niet gevonden of niet verified" };

  const [allExtractions, themes, currentMeetingThemes, currentExtractionThemes] = await Promise.all(
    [
      getMeetingExtractions(parsed.data.meetingId),
      listVerifiedThemes({ includeNegativeExamples: true }),
      getMeetingThemesForDevTagger(parsed.data.meetingId),
      getExtractionThemesForDevTagger(parsed.data.meetingId),
    ],
  );

  const filteredExtractions = allExtractions.filter((e) => TAGGER_TYPES.has(e.type));

  const themesContext: ThemeContext[] = themes.map((t) => ({
    themeId: t.id,
    name: t.name,
    description: t.description,
    matching_guide: t.matching_guide,
  }));

  const negativeExamples: NegativeExample[] = themes.flatMap((t) =>
    t.negative_examples.map((n) => ({
      themeId: t.id,
      evidenceQuote: n.evidence_quote,
      reason: n.reason,
    })),
  );

  const taggerInput: TagMeetingThemesInput = {
    meeting: {
      meetingId: parsed.data.meetingId,
      title: meeting.title ?? "",
      summary: meeting.summary ?? "",
      extractions: filteredExtractions.map((e) => ({
        id: e.id,
        type: e.type,
        content: e.content,
      })),
    },
    themes: themesContext,
    negativeExamples,
  };

  const taggerOutput = await tagMeetingThemes(taggerInput);

  return {
    taggerOutput,
    inputSummary: {
      meetingId: parsed.data.meetingId,
      title: meeting.title ?? "",
      extractionsTotal: allExtractions.length,
      extractionsAfterTypeFilter: filteredExtractions.length,
      themesCount: themes.length,
      negativeExamplesCount: negativeExamples.length,
    },
    currentMeetingThemes,
    currentExtractionThemes,
    inputExtractions: filteredExtractions.map((e) => ({
      id: e.id,
      type: e.type,
      content: e.content,
    })),
    themesLookup: themes.map((t) => ({
      themeId: t.id,
      name: t.name,
      emoji: t.emoji,
      slug: t.slug,
      status: t.status,
    })),
    systemPrompt: THEME_TAGGER_SYSTEM_PROMPT,
  };
}
