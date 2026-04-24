import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ThemeNarratorOutputSchema,
  NARRATIVE_TOTAL_CHAR_CAP,
  type ThemeNarratorOutput,
} from "../validations/theme-narrator";
import { withAgentRun } from "./run-logger";

/**
 * TH-014 (AI-252) — Theme-Narrator agent.
 *
 * Draait per thema, na élke write van meeting_themes voor dat thema (via
 * pipeline-hook in link-themes.ts). Synthetiseert alle `meeting_themes.summary`
 * rijen voor het thema tot één lopende thema-pagina met zes secties + een
 * signaal-check.
 *
 * Model-keuze: Sonnet 4.6 met `effort: "high"` — de blind-spots-sectie vraagt
 * cross-meeting patroon-detectie die baat heeft bij extended reasoning; 4.6
 * is daarvoor gebouwd en rechtvaardigt de meer-kosten tegenover Sonnet 4.5.
 * Validatie-experimenten (Founder-ritme 4 meetings, Team capaciteit 3
 * meetings) liepen op vergelijkbare kwaliteit; we kiezen nu voor de bovenkant
 * zodat regressies door thin-signal thema's minder waarschijnlijk zijn.
 *
 * Guardrail (<2 meetings) zit NIET hier maar in de pipeline-step
 * `synthesize-theme-narrative.ts`. Als deze agent wordt aangeroepen heeft de
 * caller al geverifieerd dat er ≥2 meetings met summary zijn.
 */

export const THEME_NARRATOR_PROMPT_VERSION = "v1";
export const THEME_NARRATOR_MODEL = "claude-sonnet-4-6";

export const THEME_NARRATOR_SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/theme-narrator.md"),
  "utf8",
).trimEnd();

export interface ThemeNarratorThemeInput {
  themeId: string;
  name: string;
  emoji: string;
  description: string;
  matching_guide: string;
}

export interface ThemeNarratorMeetingInput {
  meeting_id: string;
  date: string | null;
  title: string | null;
  confidence: "medium" | "high";
  evidence_quote: string;
  summary: string;
}

export interface RunThemeNarratorInput {
  theme: ThemeNarratorThemeInput;
  meetings: ThemeNarratorMeetingInput[];
  telemetryContext?: Record<string, unknown>;
}

export type { ThemeNarratorOutput };

/**
 * Pure agent-call: data-in / data-uit. Geen DB-side-effects behalve de
 * agent_runs log via withAgentRun. Pipeline-integratie (upsert naar
 * theme_narratives) zit in `pipeline/steps/synthesize-theme-narrative.ts`.
 *
 * Post-validatie:
 *   - Totale prose-lengte wordt gecapped op NARRATIVE_TOTAL_CHAR_CAP. Bij
 *     overschrijding wordt vanaf `blind_spots` teruggewerkt tot onder de cap
 *     — briefing + signal_* blijven altijd intact (zijn de minima).
 *   - Nooit throw — pipeline-step vangt errors en schrijft dan niks (de
 *     bestaande narrative-rij blijft staan; EDGE-250).
 */
export async function runThemeNarrator(input: RunThemeNarratorInput): Promise<ThemeNarratorOutput> {
  const userPrompt = buildUserPrompt(input);

  return withAgentRun(
    {
      agent_name: "theme-narrator",
      model: THEME_NARRATOR_MODEL,
      prompt_version: THEME_NARRATOR_PROMPT_VERSION,
      metadata: {
        theme_id: input.theme.themeId,
        meetings_count: input.meetings.length,
        ...input.telemetryContext,
      },
    },
    async () => {
      const { object, usage } = await generateObject({
        model: anthropic(THEME_NARRATOR_MODEL),
        maxRetries: 3,
        temperature: 0.3,
        schema: ThemeNarratorOutputSchema,
        providerOptions: {
          anthropic: { effort: "high" },
        },
        messages: [
          {
            role: "system",
            content: THEME_NARRATOR_SYSTEM_PROMPT,
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          { role: "user", content: userPrompt },
        ],
      });

      const capped = enforceTotalCharCap(object);

      return { result: capped, usage };
    },
  );
}

/**
 * Totale char-cap afdwingen. Volgorde van weglaten bij overschrijding:
 * blind_spots → open_points → friction → alignment → patterns. Briefing +
 * signal_* blijven altijd staan (schema vereist ze en ze zijn de UI-minima).
 * Bij weglaten: console.warn zodat we zien hoe vaak dit voorkomt.
 */
function enforceTotalCharCap(output: ThemeNarratorOutput): ThemeNarratorOutput {
  const totalChars = (text: string | null | undefined) => (text ?? "").length;
  const currentTotal = () =>
    totalChars(result.briefing) +
    totalChars(result.patterns) +
    totalChars(result.alignment) +
    totalChars(result.friction) +
    totalChars(result.open_points) +
    totalChars(result.blind_spots) +
    totalChars(result.signal_notes);

  const result: ThemeNarratorOutput = { ...output };
  const dropOrder: Array<keyof ThemeNarratorOutput> = [
    "blind_spots",
    "open_points",
    "friction",
    "alignment",
    "patterns",
  ];

  for (const key of dropOrder) {
    if (currentTotal() <= NARRATIVE_TOTAL_CHAR_CAP) break;
    if (result[key]) {
      console.warn(
        `[theme-narrator] total prose exceeds ${NARRATIVE_TOTAL_CHAR_CAP} chars — dropping "${String(key)}"`,
      );
      (result as Record<string, unknown>)[key] = null;
    }
  }

  return result;
}

function buildUserPrompt(input: RunThemeNarratorInput): string {
  const themeBlock = [
    `# Thema`,
    `naam: ${input.theme.emoji} ${input.theme.name}`,
    `beschrijving: ${input.theme.description}`,
    ``,
    `## Matching guide`,
    input.theme.matching_guide,
  ].join("\n");

  const meetingsBlock = input.meetings
    .map((m, i) => {
      const dateStr = m.date ? formatDateNl(m.date) : "(datum onbekend)";
      const titleStr = m.title ?? "(geen titel)";
      const header = `### Meeting ${i + 1} — ${dateStr} · ${titleStr}`;
      const meta = `confidence: ${m.confidence}${m.evidence_quote ? ` · evidence-quote: "${m.evidence_quote}"` : ""}`;
      return [header, meta, "", m.summary].join("\n");
    })
    .join("\n\n---\n\n");

  return [
    themeBlock,
    ``,
    `# Meeting-samenvattingen (${input.meetings.length} meetings, chronologisch — nieuwste eerst)`,
    ``,
    meetingsBlock,
  ].join("\n");
}

/** `2026-04-23` → `23 apr`. Voor inline referenties in de prompt. Compact. */
function formatDateNl(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = [
    "jan",
    "feb",
    "mrt",
    "apr",
    "mei",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "dec",
  ];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}
