import { z } from "zod";

export const ThemeSchema = z.object({
  title: z.string().describe("Themanaam, kort en beschrijvend"),
  summary: z.string().describe("Korte beschrijving van wat er over dit thema besproken is"),
  quotes: z
    .array(z.string())
    .describe("1-3 letterlijke quotes uit het transcript die dit thema ondersteunen"),
});

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
  kernpunten: z.array(z.string()).describe("3-7 kernpunten van de meeting, elk 1-2 zinnen"),
  deelnemers: z
    .array(ParticipantProfileSchema)
    .describe("Profiel per deelnemer op basis van het transcript"),
  themas: z.array(ThemeSchema).describe("1-6 besproken thema's met onderbouwende quotes"),
  sfeer: z.string().describe("Sfeer en dynamiek van het gesprek in 1-2 zinnen"),
  context: z
    .string()
    .describe(
      "Achtergrond en relevantie: waarom is deze meeting belangrijk, wat ging eraan vooraf",
    ),
  vervolgstappen: z
    .array(z.string())
    .describe("Concrete vervolgstappen die uit de meeting voortkomen"),
});

export type SummarizerOutput = z.infer<typeof SummarizerOutputSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type ParticipantProfile = z.infer<typeof ParticipantProfileSchema>;
