import { z } from "zod";

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
});

export type SummarizerOutput = z.infer<typeof SummarizerOutputSchema>;
export type ParticipantProfile = z.infer<typeof ParticipantProfileSchema>;
