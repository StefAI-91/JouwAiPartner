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
      "5-10 kernpunten van de meeting, geordend op belang. " +
        "Elk punt begint met een bold label als het een duidelijke categorie heeft: " +
        '**Besluit:** ..., **Behoefte:** ..., **Signaal:** ..., **Risico:** ..., **Afspraak:** ... ' +
        "Punten zonder duidelijke categorie hebben geen label. " +
        "Voeg relevante quotes inline toe tussen aanhalingstekens waar dat waarde toevoegt.",
    ),
  deelnemers: z
    .array(ParticipantProfileSchema)
    .describe("Profiel per deelnemer op basis van het transcript"),
  vervolgstappen: z
    .array(z.string())
    .describe(
      "Concrete vervolgstappen die uit de meeting voortkomen. " +
        "Formaat: 'Actie — eigenaar, deadline' als eigenaar/deadline bekend zijn.",
    ),
});

export type SummarizerOutput = z.infer<typeof SummarizerOutputSchema>;
export type ParticipantProfile = z.infer<typeof ParticipantProfileSchema>;
