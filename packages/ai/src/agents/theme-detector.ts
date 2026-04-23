import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ThemeDetectorOutputSchema,
  MATCHES_HARD_CAP,
  PROPOSALS_HARD_CAP,
  type ThemeDetectorOutput,
} from "../validations/theme-detector";
import { THEME_EMOJIS, THEME_EMOJI_FALLBACK } from "./theme-emojis";
import { withAgentRun } from "./run-logger";

/**
 * TH-011 (AI-230 + AI-233 + AI-234) — Theme-Detector agent.
 *
 * Draait serieel na de Gatekeeper, vóór Summarizer + RiskSpecialist. Kent
 * nog géén extractions (die bestaan op dat moment niet). Output voedt:
 *   - Summarizer + RiskSpecialist (als identified_themes context)
 *   - link-themes.ts (schrijft meeting_themes + extraction_themes weg en
 *     creëert emerging themes uit proposals)
 *
 * Model-keuze: Sonnet 4.6 analoog aan de Risk Specialist — het oordeel
 * "is dit substantieel en cross-cutting of project-specifiek?" is een
 * afweging-taak waar Haiku te kort bij valt. Prompt-version wordt als
 * telemetry-veld naar `agent_runs` geschreven (via withAgentRun).
 */

export const THEME_DETECTOR_PROMPT_VERSION = "v1";
export const THEME_DETECTOR_MODEL = "claude-sonnet-4-6";

export const THEME_DETECTOR_SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/theme-detector.md"),
  "utf8",
).trimEnd();

const SYSTEM_PROMPT = THEME_DETECTOR_SYSTEM_PROMPT;

export interface ThemeCatalogEntry {
  themeId: string;
  name: string;
  description: string;
  matching_guide: string;
}

export interface ThemeDetectorNegativeExample {
  themeId: string;
  evidenceQuote: string;
  reason: "niet_substantieel" | "ander_thema" | "te_breed";
}

export interface ThemeDetectorIdentifiedProject {
  project_name: string;
  project_id: string | null;
}

export interface ThemeDetectorMeetingContext {
  meetingId: string;
  title: string;
  meeting_type: string;
  party_type: string;
  participants: string[];
  summary: string;
  identified_projects: ThemeDetectorIdentifiedProject[];
}

export interface RunThemeDetectorInput {
  meeting: ThemeDetectorMeetingContext;
  themes: ThemeCatalogEntry[];
  negativeExamples: ThemeDetectorNegativeExample[];
}

export type { ThemeDetectorOutput };

/**
 * Pure agent-call: data-in / data-uit. Geen DB-side-effects behalve de
 * agent_runs log via withAgentRun. Pipeline-integratie (meeting_themes +
 * extraction_themes wegschrijven, emerging themes aanmaken) zit in
 * `pipeline/steps/link-themes.ts`.
 *
 * Post-validatie:
 *   - identified_themes met onbekende themeId → weggefilterd + warning.
 *   - Caps onafhankelijk toegepast (AI-233): max 6 identified + max 3 proposals.
 *   - Nooit throw — crash = pipeline breaks.
 */
export async function runThemeDetector(input: RunThemeDetectorInput): Promise<ThemeDetectorOutput> {
  const userPrompt = buildUserPrompt(input);
  const validThemeIds = new Set(input.themes.map((t) => t.themeId));

  return withAgentRun(
    {
      agent_name: "theme-detector",
      model: THEME_DETECTOR_MODEL,
      prompt_version: THEME_DETECTOR_PROMPT_VERSION,
      metadata: {
        meeting_id: input.meeting.meetingId,
        themes_considered: input.themes.length,
      },
    },
    async () => {
      const { object, usage } = await generateObject({
        model: anthropic(THEME_DETECTOR_MODEL),
        maxRetries: 3,
        temperature: 0,
        schema: ThemeDetectorOutputSchema,
        providerOptions: {
          anthropic: { effort: "medium" },
        },
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          { role: "user", content: userPrompt },
        ],
      });

      // Hallucination-strip: verwijder identified_themes met een themeId
      // die niet in de meegegeven catalogus staat. Anthropic's structured-
      // output kan af en toe een plausibele-maar-verzonnen UUID opleveren;
      // de cap-volgorde doet matcht eerst filteren, daarna capten.
      const knownIdentified = object.identified_themes.filter((t) => {
        if (validThemeIds.has(t.themeId)) return true;
        console.warn(
          `[theme-detector] onbekende themeId "${t.themeId}" gestript — meeting=${input.meeting.meetingId}`,
        );
        return false;
      });

      const capped: ThemeDetectorOutput = {
        identified_themes: knownIdentified.slice(0, MATCHES_HARD_CAP),
        proposed_themes: object.proposed_themes.slice(0, PROPOSALS_HARD_CAP),
      };

      return { result: capped, usage };
    },
  );
}

function buildUserPrompt(input: RunThemeDetectorInput): string {
  const negativesByTheme = groupNegativesByTheme(input.negativeExamples);

  const themesBlock = input.themes
    .map((theme) => {
      const negatives = negativesByTheme.get(theme.themeId) ?? [];
      const negativeLines = negatives.length
        ? `\n  negativeExamples:\n${negatives
            .slice(0, 3)
            .map((n) => `    - "${n.evidenceQuote}" (reden: ${n.reason})`)
            .join("\n")}`
        : "";
      return [
        `- themeId: ${theme.themeId}`,
        `  name: ${theme.name}`,
        `  description: ${theme.description}`,
        `  matching_guide: ${theme.matching_guide}${negativeLines}`,
      ].join("\n");
    })
    .join("\n\n");

  const projectsBlock = input.meeting.identified_projects.length
    ? input.meeting.identified_projects.map((p) => `- ${p.project_name}`).join("\n")
    : "(geen projecten geïdentificeerd)";

  const participantsLine =
    input.meeting.participants.length > 0
      ? input.meeting.participants.join(", ")
      : "(onbekende deelnemers)";

  const emojiShortlist = [...THEME_EMOJIS, THEME_EMOJI_FALLBACK].join(" ");

  return [
    `# Meeting`,
    `title: ${input.meeting.title}`,
    `meeting_type: ${input.meeting.meeting_type}`,
    `party_type: ${input.meeting.party_type}`,
    `participants: ${participantsLine}`,
    ``,
    `## Identified projects (van Gatekeeper)`,
    projectsBlock,
    ``,
    `## Summary`,
    input.meeting.summary || "(lege summary)",
    ``,
    `## Bestaande themes (${input.themes.length})`,
    themesBlock || "(geen themes beschikbaar)",
    ``,
    `## Emoji-shortlist (voor eventuele proposals, kies exact één)`,
    emojiShortlist,
  ].join("\n");
}

function groupNegativesByTheme(
  examples: ThemeDetectorNegativeExample[],
): Map<string, ThemeDetectorNegativeExample[]> {
  const map = new Map<string, ThemeDetectorNegativeExample[]>();
  for (const ex of examples) {
    const arr = map.get(ex.themeId);
    if (arr) arr.push(ex);
    else map.set(ex.themeId, [ex]);
  }
  return map;
}
