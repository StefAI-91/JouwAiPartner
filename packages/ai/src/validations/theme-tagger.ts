import { z } from "zod";
import { ALL_THEME_EMOJIS } from "../agents/theme-emojis";

/**
 * TH-002 — Zod-schema voor ThemeTagger output.
 *
 * Anthropic's structured-output API is strikt over JSON-schema features:
 * géén `maxItems`, `minimum`, `maximum`, `minLength`, `maxLength`, of
 * `pattern`. We houden het schema daarom kaal (alleen `.enum()`, `.nullable()`,
 * `.optional()`, `.describe()` en basistypes) en doen alle post-validatie
 * (size-caps, UUID-check, presence) in `tagMeetingThemes()` zelf. De prompt
 * verwoordt de regels; de code dwingt ze af.
 *
 * Confidence-discipline: `enum('medium', 'high')` — `low` kan Zod wel
 * weigeren want enums zijn toegestaan. Emoji idem (`enum(ALL_THEME_EMOJIS)`).
 */

export const MATCHES_HARD_CAP = 4;
export const PROPOSALS_HARD_CAP = 2;
export const EXTRACTION_IDS_PER_MATCH_CAP = 8;

/**
 * TH-010 — Starter-set van extraction-types die de ThemeTagger überhaupt te
 * zien krijgt. Andere types (bv. `blocker`, `commitment`) worden op pipeline-
 * niveau uit de input gefilterd — zodra we in de praktijk zien dat ze waarde
 * toevoegen volstaat één regel uitbreiden hier.
 *
 * TH-010 update: `risk` toegevoegd zodat de bestaande Risk Specialist output
 * via `extraction_themes` aan thema's wordt gehangen. Zonder deze toevoeging
 * zag de Tagger risks nooit en bleven `extractionIds` leeg op meetings die
 * vooral risk-signal bevatten.
 */
export const TAGGER_EXTRACTION_TYPES = [
  "decision",
  "action_item",
  "need",
  "insight",
  "risk",
] as const;

export const ThemeMatchSchema = z.object({
  themeId: z.string().describe("UUID van het bestaande verified/emerging thema dat matcht."),
  confidence: z
    .enum(["medium", "high"])
    .describe("Confidence-bucket. 'low' filter je zelf eruit — die komen niet in de output."),
  evidenceQuote: z
    .string()
    .describe("Letterlijke quote uit summary/extractions waaruit de match blijkt."),
  themeSummary: z
    .string()
    .describe(
      "1-2 zinnen (NL): wat ging DEZE meeting specifiek over dit thema? Narratief, niet copy-paste van de quote. Grond je alleen op summary + extractions; verzin geen context.",
    ),
  extractionIds: z
    .array(z.string())
    .describe(
      "UUIDs van de extractions die dít thema dragen — kopieer exact uit input. Minstens één per medium/high match; hallucinated IDs worden post-validatie weggefilterd.",
    ),
});

export const ThemeProposalSchema = z.object({
  name: z.string().describe("Korte label voor het nieuwe thema (max ~6 woorden)."),
  description: z.string().describe("Eén zin, UI-display."),
  emoji: z
    .enum(ALL_THEME_EMOJIS)
    .describe("Kies exact één emoji uit de shortlist. '🏷️' is de fallback."),
  evidenceQuote: z.string().describe("Letterlijke quote waaruit het thema blijkt."),
  reasoning: z
    .string()
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
    themesConsidered: z
      .number()
      .describe("Hoeveel themes zijn afgewogen (lengte van de input-lijst)."),
    skipped: z.string().optional(),
  }),
});

export type ThemeMatch = z.infer<typeof ThemeMatchSchema>;
export type ThemeProposal = z.infer<typeof ThemeProposalSchema>;
export type ThemeTaggerOutput = z.infer<typeof ThemeTaggerOutputSchema>;
