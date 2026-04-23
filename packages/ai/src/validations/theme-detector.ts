import { z } from "zod";
import { ALL_THEME_EMOJIS } from "../agents/theme-emojis";

/**
 * MB-3 — Snel UUID-format shape-check via `.refine()`. Anthropic's
 * structured-output accepteert geen `format: uuid` of `pattern` in het
 * schema, dus we valideren client-side na Zod-parse. Dit vangt `"theme-a"`
 * of `"undefined"`-achtige strings vóór ze bij de hallucination-strip
 * belanden — duidelijkere foutmelding + behoud dezelfde output shape.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * TH-011 (AI-231) — Zod-schema voor Theme-Detector output.
 *
 * De Theme-Detector draait serieel na de Gatekeeper en vóór Summarizer +
 * RiskSpecialist. Hij kent alléén de meeting-summary + identified_projects
 * (géén extractions — die bestaan op dat moment nog niet), en moet uitspreken:
 *   1. Welke verified themes spelen hier substantieel?
 *   2. Welke nieuwe themes zou je voorstellen?
 *
 * Anthropic's structured-output API accepteert geen `maxItems/min/max/length/
 * pattern` — size-caps en UUID-filters doen we post-validatie in
 * `runThemeDetector()`. Zod legt alleen de shape vast; de prompt verwoordt
 * de substantialiteitsregel en voorbeelden.
 *
 * `theme_summary` per identified_theme is bewust één veld: het wordt direct
 * weggeschreven naar `meeting_themes.summary` door `link-themes.ts`. Bij
 * onvoldoende kwaliteit kan een latere sprint alsnog een JS-composer
 * toevoegen; nu houden we de bron in de agent-output.
 */

export const MATCHES_HARD_CAP = 6;
export const PROPOSALS_HARD_CAP = 3;

export const IdentifiedThemeSchema = z.object({
  themeId: z
    .string()
    .refine((v) => UUID_RE.test(v), { message: "themeId moet een UUID zijn" })
    .describe("UUID van een bestaand verified thema uit de meegestuurde catalogus."),
  confidence: z
    .enum(["medium", "high"])
    .describe("Confidence-bucket. 'low' filter je zelf eruit — die komen niet in de output."),
  relevance_quote: z
    .string()
    .describe("Letterlijke quote uit de meeting-summary waaruit de theme-match blijkt."),
  theme_summary: z
    .string()
    .describe(
      "1-2 zinnen (NL): wat ging DEZE meeting specifiek over dit thema? Narratief, niet copy-paste van de quote. Grond je alleen op summary + identified_projects.",
    ),
  substantialityEvidence: z
    .object({
      extractionCount: z
        .number()
        .optional()
        .describe(
          "Aantal losse onderwerpen/kernpunten over dit thema (schatting uit summary, minimaal 2 vereist).",
        ),
      wordCount: z
        .number()
        .optional()
        .describe(
          "Geschat aantal woorden substantiële discussie over dit thema (minimaal 100 vereist).",
        ),
      reason: z
        .string()
        .describe(
          "Eén zin: waarom is dit substantieel genoeg? Bij twijfel: 'losse vermelding, geen match' en dan hoort het thema hier NIET.",
        ),
    })
    // MB-5: cross-field refinement. De prompt schrijft "minstens één van
    // (a) extractionCount OF (b) wordCount moet aanwezig zijn". Zonder
    // deze check kan een LLM beide weglaten en alleen `reason: "genoeg"`
    // sturen, waardoor de substantialiteitsregel alleen op de prompt
    // vertrouwt. Refine maakt de regel afdwingbaar op Zod-laag.
    .refine((ev) => ev.extractionCount !== undefined || ev.wordCount !== undefined, {
      message: "substantialityEvidence vereist minstens extractionCount of wordCount",
    })
    .describe(
      "Onderbouwing voor de substantialiteitsregel. Minstens één van (a) ≥2 kernpunten OF (b) ≥100 woorden moet gelden, anders geen match.",
    ),
});

export const ProposedThemeSchema = z.object({
  name: z.string().describe("Korte label voor het nieuwe thema (max ~6 woorden)."),
  description: z.string().describe("Eén zin, UI-display."),
  matching_guide: z
    .string()
    .describe(
      "2-4 zinnen: beschrijf wanneer dit thema matcht en wanneer niet. Zelfde discipline als de verified catalogus — dit wordt de guide die future runs gebruiken.",
    ),
  emoji: z
    .enum(ALL_THEME_EMOJIS)
    .describe("Kies exact één emoji uit de shortlist. '🏷️' is de fallback."),
  rationale: z
    .string()
    .describe(
      "Waarom een nieuw thema en niet een bestaand? Benoem welk bestaand thema het dichtst was en waarom het toch niet past.",
    ),
  evidence_quote: z
    .string()
    .describe("Letterlijke quote uit de summary waaruit het nieuwe thema blijkt."),
});

export const ThemeDetectorOutputSchema = z.object({
  identified_themes: z
    .array(IdentifiedThemeSchema)
    .describe(
      "Themes uit de catalogus die substantieel spelen in deze meeting. Max 6 — meer duidt op over-matching. Cap wordt post-validatie toegepast.",
    ),
  proposed_themes: z
    .array(ProposedThemeSchema)
    .describe(
      "Nieuwe themes om voor te stellen (emerging). Max 3 — proposals spammen we nooit. Cap wordt post-validatie toegepast.",
    ),
});

export type IdentifiedTheme = z.infer<typeof IdentifiedThemeSchema>;
export type ProposedTheme = z.infer<typeof ProposedThemeSchema>;
export type ThemeDetectorOutput = z.infer<typeof ThemeDetectorOutputSchema>;
