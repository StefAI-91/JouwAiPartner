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
        "of '### [Algemeen] Themanaam' voor niet-project-specifieke content) en inhoudelijke punten in platte, " +
        "goed leesbare zinnen. De project-prefix tussen vierkante haken is VERPLICHT op elke thema-kop; " +
        "gebruik EXACT de schrijfwijze uit BEKENDE ENTITEITEN of EXACT '[Algemeen]'. " +
        "Gebruik GEEN `**Besluit:** / **Risico:** / **Behoefte:** / ...` inline-labels — classificatie gebeurt " +
        "door aparte extractor-agents. Voeg ruimhartig exacte quotes inline toe; informatieverlies is erger " +
        "dan een te lange samenvatting.",
    ),
  deelnemers: z
    .array(ParticipantProfileSchema)
    .describe("Profiel per deelnemer op basis van het transcript"),
});

export type SummarizerOutput = z.infer<typeof SummarizerOutputSchema>;
export type ParticipantProfile = z.infer<typeof ParticipantProfileSchema>;
