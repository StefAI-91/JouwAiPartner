import { z } from "zod";

export const ProjectSummaryOutputSchema = z.object({
  context: z
    .string()
    .describe(
      "Neutrale projectbeschrijving in 4-5 zinnen voor iemand die het project niet kent. " +
        "Wat is het project, wie is de klant, welke aanpak/technologie, scope, wie werkt eraan, " +
        "wanneer moet het af. Geen meningen, geen risico's, puur feitelijk.",
    ),
  briefing: z
    .string()
    .describe(
      "Forward-looking analyse in 4-5 zinnen. Voortgang vs deadline, openstaande actiepunten, " +
        "risico's en blokkades, en wat het team nu zou moeten doen. " +
        "Wees direct en actiegericht. Noem concrete namen, datums en items.",
    ),
});

export type ProjectSummaryOutput = z.infer<typeof ProjectSummaryOutputSchema>;

export const OrgSummaryOutputSchema = z.object({
  context: z
    .string()
    .describe(
      "Neutrale organisatiebeschrijving in 3-4 zinnen. Wie is de klant, wat voor bedrijf, " +
        "relatie met ons, lopende projecten, contactpersoon. Puur feitelijk.",
    ),
  briefing: z
    .string()
    .describe(
      "Klant-analyse in 3-4 zinnen. Klant-sentiment, aandachtspunten, " +
        "openstaande behoeften, en eventuele risico's in de relatie. Actiegericht.",
    ),
});

export type OrgSummaryOutput = z.infer<typeof OrgSummaryOutputSchema>;
