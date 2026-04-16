import { z } from "zod";

export const MogelijkeOpvolgingSchema = z.object({
  key: z
    .string()
    .describe("Deterministische key in kebab-case met prefix, bijv. 'opvolging:svpe-vervolgcall'"),
  onderwerp: z.string().describe("Kort onderwerp, max 10 woorden"),
  context: z
    .string()
    .describe(
      "1-2 zinnen context. Suggestief, niet dwingend. " +
        "Bijv. 'Werd besproken op 13 april, niet meer teruggekomen in latere overleggen.'",
    ),
  laatst_besproken: z.string().describe("Datum in ISO format (YYYY-MM-DD)"),
  meeting_titels: z.array(z.string()).describe("Titels van meetings waar dit besproken werd"),
});

export const KlantPipelineSchema = z.object({
  key: z.string().describe("Deterministische key, bijv. 'pipeline:looping'"),
  naam: z.string().describe("Klant- of projectnaam"),
  status_samenvatting: z
    .string()
    .describe(
      "One-liner status zoals besproken in de meetings. " +
        "Geef de status weer, voeg geen eigen oordeel toe.",
    ),
  laatst_besproken: z.string().describe("Datum in ISO format (YYYY-MM-DD)"),
  signaal: z.enum(["positief", "neutraal", "risico"]),
});

export const TerugkerendThemaSchema = z.object({
  key: z.string().describe("Deterministische key, bijv. 'thema:werkdruk-stef'"),
  thema: z.string().describe("Thema omschrijving, max 8 woorden"),
  frequentie: z.number().describe("Aantal meetings waarin dit voorkwam"),
  trend: z.enum(["escalerend", "stabiel", "afnemend"]),
  toelichting: z.string().describe("1-2 zinnen toelichting over het patroon"),
});

export const ManagementInsightsOutputSchema = z.object({
  week_samenvatting_kort: z
    .string()
    .describe(
      "Maximaal 2 zinnen, totaal max 40 woorden. " +
        "Eerste zin: de rode draad (wat hield de eigenaren bezig). " +
        "Tweede zin: één aandachtspunt. Geen opsommingen, geen projectnamen tenzij cruciaal. " +
        "Dit is de dashboard-variant die in één oogopslag gelezen wordt.",
    ),
  week_samenvatting_lang: z
    .string()
    .describe(
      "Twee alinea's, totaal 80-120 woorden. " +
        "Eerste alinea: wat er de afgelopen periode besproken is, welke onderwerpen de boventoon voerden, welke klanten/projecten aandacht kregen. " +
        "Tweede alinea: waar extra aandacht aan besteed mag worden en waarom — signalen, risico's, kansen. " +
        "Schrijf als management briefing: feitelijk, concreet, geen bullet points. Vloeiende tekst.",
    ),
  mogelijke_opvolging: z
    .array(MogelijkeOpvolgingSchema)
    .describe(
      "Onderwerpen of afspraken die besproken zijn maar niet meer terugkwamen in latere meetings. " +
        "Alleen opnemen als het een concreet onderwerp betreft (afspraak, vervolgactie, besluit). " +
        "Niet opnemen als het slechts een zijopmerking was.",
    ),
  klant_pipeline: z
    .array(KlantPipelineSchema)
    .describe(
      "Per besproken klant of extern project een one-liner status. " +
        "Baseer je alleen op wat er in de meetings gezegd is, voeg geen eigen oordeel toe.",
    ),
  terugkerende_themas: z
    .array(TerugkerendThemaSchema)
    .describe(
      "Onderwerpen die in 3 of meer meetings terugkomen. " +
        "Geef aan of het thema escaleert, stabiel is, of afneemt.",
    ),
});

export type ManagementInsightsOutput = z.infer<typeof ManagementInsightsOutputSchema>;
