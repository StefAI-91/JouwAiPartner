import { z } from "zod";

/**
 * TH-013 — UUID-format shape-check via `.refine()`. Anthropic's structured-
 * output accepteert geen `format: uuid` of `pattern` in het schema, dus we
 * valideren client-side na Zod-parse. Identiek patroon aan
 * `IdentifiedThemeSchema` in theme-detector (TH-011 MB-3).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ParticipantProfileSchema = z.object({
  name: z.string().describe("Naam of speaker-label van de deelnemer"),
  role: z.string().nullable().describe("Rol of functie als genoemd/afgeleid, null als onbekend"),
  organization: z
    .string()
    .nullable()
    .describe("Organisatie als genoemd/afgeleid, null als onbekend"),
  stance: z
    .string()
    .nullable()
    .describe(
      "Houding/positie in het gesprek (bijv. 'enthousiast', 'kritisch', 'afwachtend'), null als onduidelijk",
    ),
});

/**
 * TH-013 (AI-240) — Per-thema rijke samenvatting. Eén entry per identified
 * theme uit de meeting. `briefing` is 2-4 zinnen narratief; `kernpunten` +
 * `vervolgstappen` bevatten alleen thema-relevante bullets (niet de
 * meeting-brede set opnieuw). `themeId` is de UUID uit de catalogus —
 * onbekende IDs worden post-validatie gestript door `runSummarizer()`
 * (hallucination-strip, EDGE-240). Caps (AI-243) worden eveneens post-
 * validatie toegepast zodat `generateObject` blijft matchen op de shape.
 */
export const ThemeSummarySchema = z.object({
  themeId: z
    .string()
    .refine((v) => UUID_RE.test(v), { message: "themeId moet een UUID zijn" })
    .describe("UUID van een bestaand identified theme uit de meegestuurde context."),
  briefing: z
    .string()
    .describe(
      "2-4 zinnen narratief (NL): wat ging DEZE meeting specifiek over dit thema? " +
        "Beschrijf de dynamiek, positionering, het besluit — niet de onderwerp-context die toevallig " +
        "het onderwerp was. Bij weinig raakpunten: kortere briefing is prima, maar nooit leeg.",
    ),
  kernpunten: z
    .array(z.string())
    .describe(
      "Bullets die onder dit thema vallen. Categorie-labels mogen (**Besluit:**, **Signaal:**, etc.) " +
        "maar GEEN project-prefix — die is in de meeting-wide kernpunten al gezet. " +
        "Lege array als het thema geen discrete punten opleverde.",
    ),
  vervolgstappen: z
    .array(z.string())
    .describe(
      "Thema-relevante acties. Lege array als er geen zijn. " +
        "Formaat zonder project-prefix: 'Actie — eigenaar, deadline'.",
    ),
});

export const SummarizerOutputSchema = z.object({
  briefing: z
    .string()
    .describe(
      "Narratieve samenvatting in 3-5 zinnen, alsof je een collega in 30 seconden bijpraat. " +
        "Noem wie er spraken, met welke organisatie, wat het belangrijkste resultaat was, " +
        "en of er vervolgacties zijn. Schrijf in verleden tijd, informeel maar professioneel.",
    ),
  kernpunten: z
    .array(z.string())
    .describe(
      "Kernpunten GEGROEPEERD PER THEMA. Afwisselend thema-koppen (format: '### [ProjectNaam] Themanaam' " +
        "of '### [Algemeen] Themanaam' voor niet-project-specifieke content) en inhoudelijke punten. " +
        "Thema-koppen zijn korte beschrijvingen van het onderwerp (max 4-5 woorden na de prefix). " +
        "De project-prefix tussen vierkante haken is VERPLICHT op elke thema-kop; gebruik EXACT de " +
        "schrijfwijze uit BEKENDE ENTITEITEN of EXACT '[Algemeen]'. " +
        "Inhoudelijke punten beginnen met een bold label als ze een categorie hebben: " +
        "**Besluit:** ..., **Behoefte:** ..., **Signaal:** ..., **Risico:** ..., **Afspraak:** ..., **Visie:** ..., **Context:** ..., **Voorbeeld:** ... " +
        "Punten zonder categorie hebben geen label. " +
        "Voeg ruimhartig exacte quotes inline toe — informatieverlies is erger dan een te lange samenvatting.",
    ),
  deelnemers: z
    .array(ParticipantProfileSchema)
    .describe("Profiel per deelnemer op basis van het transcript"),
  vervolgstappen: z
    .array(z.string())
    .describe(
      "Concrete vervolgstappen die uit de meeting voortkomen. " +
        "Formaat: '[ProjectNaam] Actie — eigenaar, deadline' als eigenaar/deadline bekend zijn, " +
        "of '[Algemeen] Actie — eigenaar, deadline' voor niet-project-specifieke acties. " +
        "De project-prefix tussen vierkante haken is VERPLICHT op elke vervolgstap; gebruik EXACT " +
        "de schrijfwijze uit BEKENDE ENTITEITEN of EXACT '[Algemeen]'. " +
        "Elke vervolgstap attribueert zichzelf, geen erfenis van eerdere items.",
    ),
  theme_summaries: z
    .array(ThemeSummarySchema)
    .describe(
      "TH-013 — Per identified theme één rijke samenvatting. Leeg array bij 0 identified_themes " +
        "in context. Max 6 entries (cap wordt post-validatie toegepast). Per entry: briefing " +
        "(2-4 zinnen thema-gescoped), kernpunten + vervolgstappen alleen thema-relevant. " +
        "Kopieer GEEN meeting-wide kernpunten 1-op-1 naar elk thema.",
    ),
});

export type SummarizerOutput = z.infer<typeof SummarizerOutputSchema>;
export type ParticipantProfile = z.infer<typeof ParticipantProfileSchema>;
export type ThemeSummary = z.infer<typeof ThemeSummarySchema>;
