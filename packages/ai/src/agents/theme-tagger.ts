import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ThemeTaggerOutputSchema,
  MATCHES_HARD_CAP,
  PROPOSALS_HARD_CAP,
  type ThemeTaggerOutput,
} from "../validations/theme-tagger";
import { THEME_EMOJIS, THEME_EMOJI_FALLBACK } from "./theme-emojis";
import { withAgentRun } from "./run-logger";

const MODEL = "claude-haiku-4-5-20251001";
const PROMPT_VERSION = "th-002-v1";

export type { ThemeTaggerOutput };

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/theme-tagger.md"),
  "utf8",
).trimEnd();

/** Eén bestaand thema zoals de agent het nodig heeft. */
export interface ThemeContext {
  themeId: string;
  name: string;
  description: string;
  matching_guide: string;
}

/** Eén eerder afgewezen match die als negative example wordt meegegeven. */
export interface NegativeExample {
  themeId: string;
  evidenceQuote: string;
  reason: "niet_substantieel" | "ander_thema" | "te_breed";
}

/** Eén extractie (decision/action_item/need/insight) die context geeft. */
export interface ExtractionContext {
  type: string;
  content: string;
}

/** Meeting-context die ThemeTagger gebruikt — rijker signaal dan alleen transcript. */
export interface MeetingContext {
  meetingId: string;
  title: string;
  summary: string;
  extractions: ExtractionContext[];
}

export interface TagMeetingThemesInput {
  meeting: MeetingContext;
  themes: ThemeContext[];
  /**
   * Per theme 2-3 recente rejections. De caller (TH-003 pipeline) haalt deze
   * uit `theme_match_rejections`. Voor unit tests: lege array of fixture.
   */
  negativeExamples: NegativeExample[];
}

/**
 * Pure agent-call: data-in / data-uit. Geen DB-side-effects behalve de
 * agent_runs log via withAgentRun. Pipeline-integratie (wegschrijven naar
 * meeting_themes + themes) zit in TH-003.
 */
export async function tagMeetingThemes(input: TagMeetingThemesInput): Promise<ThemeTaggerOutput> {
  const userPrompt = buildUserPrompt(input);

  return withAgentRun(
    {
      agent_name: "theme-tagger",
      model: MODEL,
      prompt_version: PROMPT_VERSION,
      metadata: { meeting_id: input.meeting.meetingId, themes_considered: input.themes.length },
    },
    async () => {
      const { object, usage } = await generateObject({
        model: anthropic(MODEL),
        maxRetries: 3,
        schema: ThemeTaggerOutputSchema,
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

      // Defensieve cap post-validatie. Anthropic's structured-output schema
      // accepteert geen `maxItems` op arrays, dus we kunnen het niet in Zod
      // vastleggen zonder API-errors. De prompt instrueert 4 / 2 maxima; we
      // enforcen dat hier hard voor het geval de LLM er toch overheen gaat.
      const capped: ThemeTaggerOutput = {
        ...object,
        matches: object.matches.slice(0, MATCHES_HARD_CAP),
        proposals: object.proposals.slice(0, PROPOSALS_HARD_CAP),
      };

      return { result: capped, usage };
    },
  );
}

function buildUserPrompt(input: TagMeetingThemesInput): string {
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

  const extractionsBlock = input.meeting.extractions.length
    ? input.meeting.extractions.map((e) => `- [${e.type}] ${e.content}`).join("\n")
    : "(geen extractions)";

  const emojiShortlist = [...THEME_EMOJIS, THEME_EMOJI_FALLBACK].join(" ");

  return [
    `# Meeting`,
    `title: ${input.meeting.title}`,
    `summary:\n${input.meeting.summary}`,
    ``,
    `## Extractions`,
    extractionsBlock,
    ``,
    `## Bestaande themes (${input.themes.length})`,
    themesBlock || "(geen themes beschikbaar)",
    ``,
    `## Emoji-shortlist (voor eventuele proposals, kies exact één)`,
    emojiShortlist,
  ].join("\n");
}

function groupNegativesByTheme(examples: NegativeExample[]): Map<string, NegativeExample[]> {
  const map = new Map<string, NegativeExample[]>();
  for (const ex of examples) {
    const arr = map.get(ex.themeId);
    if (arr) arr.push(ex);
    else map.set(ex.themeId, [ex]);
  }
  return map;
}
