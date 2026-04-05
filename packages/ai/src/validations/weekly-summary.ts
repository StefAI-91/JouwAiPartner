import { z } from "zod";

export const ProjectHealthSchema = z.object({
  project_id: z.string().describe("UUID van het project."),
  project_name: z.string().describe("Naam van het project."),
  status: z
    .enum(["groen", "oranje", "rood"])
    .describe(
      "Gezondheidsstatus: groen = op koers, oranje = aandacht nodig, rood = risico/probleem.",
    ),
  summary: z
    .string()
    .describe(
      "2-3 zinnen over hoe dit project ervoor staat. Combineer de briefing met task-status. " +
        "Benoem voortgang, risico's en wat er deze week is gebeurd.",
    ),
  risks: z.array(z.string()).describe("Concrete risico's voor dit project. Leeg als er geen zijn."),
  recommendations: z
    .array(z.string())
    .describe(
      "Concrete aanbevelingen/acties voor management. Bijv. 'Neem contact op met klant over deadline'.",
    ),
});

export type ProjectHealth = z.infer<typeof ProjectHealthSchema>;

export const WeeklySummaryOutputSchema = z.object({
  management_summary: z
    .string()
    .describe(
      "Management overzicht in 3-5 zinnen. Geeft de overall status van het bedrijf weer: " +
        "hoeveel projecten op koers, hoeveel risico, key highlights en aandachtspunten. " +
        "Dit is het eerste wat een manager leest.",
    ),
  project_health: z
    .array(ProjectHealthSchema)
    .describe(
      "Per actief project een gezondheidscheck. Gesorteerd: rood eerst, dan oranje, dan groen.",
    ),
  cross_project_risks: z
    .array(z.string())
    .describe(
      "Risico's die meerdere projecten raken of organisatiebrede patronen. " +
        "Bijv. 'Drie projecten hebben onopgepakte actiepunten van 2+ weken geleden'. " +
        "Leeg als er geen cross-project risico's zijn.",
    ),
  team_insights: z
    .array(z.string())
    .describe(
      "Inzichten over teamworkload en -capaciteit. Bijv. 'Wouter heeft 8 open taken, " +
        "Stef heeft er 2'. Leeg als niet relevant.",
    ),
  focus_next_week: z
    .array(z.string())
    .describe(
      "Top 3-5 concrete acties voor volgende week. Wat moet er als eerste gebeuren? " +
        "Wees specifiek: noem projecten, personen en deadlines.",
    ),
});

export type WeeklySummaryOutput = z.infer<typeof WeeklySummaryOutputSchema>;
