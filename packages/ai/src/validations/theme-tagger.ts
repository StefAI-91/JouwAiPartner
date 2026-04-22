import { z } from "zod";
import { ALL_THEME_EMOJIS } from "../agents/theme-emojis";

/**
 * TH-002 — Zod-schema voor ThemeTagger output.
 *
 * Confidence-discipline: alleen `medium` of `high` worden opgeslagen. De
 * prompt instrueert de LLM om `low` zelf uit te filteren (PRD §5.2). Als het
 * model tóch iets als low labelt, faalt de Zod-parse — dat is een bewuste
 * harde grens, geen silent drop.
 *
 * Emoji-discipline: proposals mogen exact één waarde uit `ALL_THEME_EMOJIS`
 * kiezen (42 shortlist + fallback `🏷️`). LLM-vrij kiezen = drift.
 *
 * Max 4 matches en max 2 proposals per meeting — "als alles matcht is het
 * over-tagging" (PRD §5.2). Cap wordt NIET in Zod gedaan: Anthropic's
 * structured-output-schema weigert `maxItems` op arrays. De prompt zegt de
 * regel expliciet, en `tagMeetingThemes()` doet een defensieve `.slice()`
 * na validatie. Zo blijft de hard-cap gegarandeerd zonder dat de API-call
 * faalt op schema-incompatibiliteit.
 */

export const MATCHES_HARD_CAP = 4;
export const PROPOSALS_HARD_CAP = 2;

export const ThemeMatchSchema = z.object({
  themeId: z.string().uuid().describe("UUID van het bestaande verified/emerging thema dat matcht."),
  confidence: z
    .enum(["medium", "high"])
    .describe("Confidence-bucket. 'low' filter je zelf eruit — die komen niet in de output."),
  evidenceQuote: z
    .string()
    .min(1)
    .describe("Letterlijke quote uit summary/extractions waaruit de match blijkt."),
});

export const ThemeProposalSchema = z.object({
  name: z.string().min(1).describe("Korte label voor het nieuwe thema (max ~6 woorden)."),
  description: z.string().min(1).describe("Eén zin, UI-display."),
  emoji: z
    .enum(ALL_THEME_EMOJIS)
    .describe("Kies exact één emoji uit de shortlist. '🏷️' is de fallback."),
  evidenceQuote: z.string().min(1).describe("Letterlijke quote waaruit het thema blijkt."),
  reasoning: z
    .string()
    .min(1)
    .describe(
      "Waarom een nieuw thema en niet een bestaand? Benoem welk bestaand thema het dichtst was en waarom het toch niet past.",
    ),
});

export const ThemeTaggerOutputSchema = z.object({
  matches: z
    .array(ThemeMatchSchema)
    .describe(
      "Max 4 matches per meeting — meer duidt op over-tagging. Cap wordt post-validatie toegepast.",
    ),
  proposals: z
    .array(ThemeProposalSchema)
    .describe(
      "Max 2 proposals per meeting — proposals spammen we nooit. Cap wordt post-validatie toegepast.",
    ),
  meta: z.object({
    themesConsidered: z.number().int().nonnegative(),
    skipped: z.string().optional(),
  }),
});

export type ThemeMatch = z.infer<typeof ThemeMatchSchema>;
export type ThemeProposal = z.infer<typeof ThemeProposalSchema>;
export type ThemeTaggerOutput = z.infer<typeof ThemeTaggerOutputSchema>;
