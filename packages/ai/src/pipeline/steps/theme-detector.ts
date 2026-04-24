import {
  runThemeDetector,
  type ThemeDetectorMeetingContext,
  type ThemeDetectorIdentifiedProject,
} from "../../agents/theme-detector";
import type { ThemeDetectorOutput } from "../../validations/theme-detector";
import { listVerifiedThemes, type ThemeWithNegativeExamples } from "@repo/database/queries/themes";

/**
 * TH-011 — Pipeline-step wrapper rond `runThemeDetector`. Haalt verified
 * themes (met `negative_examples`) uit de DB en roept de agent aan. Never
 * throws — een crash mag de rest van de pipeline niet breken; een lege
 * output wordt dan stilletjes doorgegeven aan Summarizer / RiskSpecialist
 * zodat die zonder theme-context gewoon blijven draaien.
 */

export interface ThemeDetectorStepInput {
  meeting: Omit<ThemeDetectorMeetingContext, "identified_projects"> & {
    identifiedProjects: ThemeDetectorIdentifiedProject[];
  };
}

export interface ThemeDetectorStepResult {
  success: boolean;
  output: ThemeDetectorOutput;
  themes_considered: number;
  /**
   * MB-1 — Cached verified-themes-lijst zodat orchestrator + `link-themes`
   * 'm kunnen hergebruiken zonder tweede DB-call. Lege array wanneer de
   * catalogus leeg was of de step faalde vóór de fetch.
   */
  verifiedThemes: ThemeWithNegativeExamples[];
  error: string | null;
}

const EMPTY_OUTPUT: ThemeDetectorOutput = {
  identified_themes: [],
  proposed_themes: [],
};

export async function runThemeDetectorStep(
  input: ThemeDetectorStepInput,
): Promise<ThemeDetectorStepResult> {
  try {
    const themes = await listVerifiedThemes({ includeNegativeExamples: true });

    if (themes.length === 0) {
      // Zonder catalogus heeft de Detector niets te matchen. Teruggeven
      // lege output zodat downstream stappen (Summarizer + link-themes)
      // weten dat er geen identified_themes zijn.
      return {
        success: true,
        output: EMPTY_OUTPUT,
        themes_considered: 0,
        verifiedThemes: [],
        error: null,
      };
    }

    const output = await runThemeDetector({
      meeting: {
        meetingId: input.meeting.meetingId,
        title: input.meeting.title,
        meeting_type: input.meeting.meeting_type,
        party_type: input.meeting.party_type,
        participants: input.meeting.participants,
        summary: input.meeting.summary,
        identified_projects: input.meeting.identifiedProjects,
      },
      themes: themes.map((t) => ({
        themeId: t.id,
        name: t.name,
        description: t.description,
        matching_guide: t.matching_guide,
      })),
      negativeExamples: themes.flatMap((t) =>
        t.negative_examples.map((n) => ({
          themeId: t.id,
          evidenceQuote: n.evidence_quote,
          reason: n.reason,
        })),
      ),
    });

    return {
      success: true,
      output,
      themes_considered: themes.length,
      verifiedThemes: themes,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[theme-detector] non-blocking failure:", msg);
    return {
      success: false,
      output: EMPTY_OUTPUT,
      themes_considered: 0,
      verifiedThemes: [],
      error: msg,
    };
  }
}
