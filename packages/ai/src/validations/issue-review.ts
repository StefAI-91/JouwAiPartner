import { z } from "zod";

export const PatternSchema = z.object({
  title: z.string().describe("Korte beschrijving van het patroon"),
  description: z.string().describe("Uitleg wat het patroon inhoudt en waarom het relevant is"),
  affected_issues: z.array(z.number()).describe("Issue numbers die bij dit patroon horen"),
  severity: z.enum(["high", "medium", "low"]).describe("Impact van dit patroon"),
});

export const RiskSchema = z.object({
  title: z.string().describe("Korte beschrijving van het risico"),
  description: z.string().describe("Waarom dit een risico is en wat de impact kan zijn"),
  affected_issues: z.array(z.number()).describe("Issue numbers die hierbij betrokken zijn"),
  urgency: z.enum(["urgent", "important", "monitor"]).describe("Hoe snel moet dit opgepakt worden"),
});

export const ActionItemSchema = z.object({
  title: z.string().describe("Concrete actie die uitgevoerd moet worden"),
  description: z.string().describe("Details over wat er gedaan moet worden"),
  priority: z.enum(["urgent", "important", "nice_to_have"]).describe("Prioriteit van deze actie"),
  related_issues: z.array(z.number()).describe("Issue numbers die hierdoor worden aangepakt"),
  effort: z.enum(["small", "medium", "large"]).describe("Geschatte inspanning"),
});

export const IssueReviewSchema = z.object({
  health_score: z
    .number()
    .describe(
      "Gezondheidscore van het project (0-100): 80-100 = gezond, 50-79 = aandacht nodig, 0-49 = kritiek",
    ),
  health_label: z.enum(["healthy", "needs_attention", "critical"]),
  summary: z.string().describe("Samenvatting van de algehele status van het project in 2-4 zinnen"),
  frontend_summary: z
    .string()
    .nullable()
    .describe(
      "Samenvatting van de frontend-situatie in 2-3 zinnen: welke bugs/issues spelen, welk component is het meest geraakt, wat is de urgentie. Null als er geen frontend issues zijn.",
    ),
  backend_summary: z
    .string()
    .nullable()
    .describe(
      "Samenvatting van de backend/API/database-situatie in 2-3 zinnen: welke bugs/issues spelen, wat is de urgentie. Null als er geen backend issues zijn.",
    ),
  patterns: z
    .array(PatternSchema)
    .describe("Terugkerende patronen in de issues (bijv. veel bugs in dezelfde component)"),
  risks: z
    .array(RiskSchema)
    .describe("Risico's die aandacht nodig hebben (bijv. oude issues, ontbrekende assignees)"),
  action_items: z
    .array(ActionItemSchema)
    .describe(
      "Top 3 concrete aanbevelingen om de projectgezondheid te verbeteren — alleen de belangrijkste, maximaal 3",
    ),
});

export type IssueReviewOutput = z.infer<typeof IssueReviewSchema>;
export type Pattern = z.infer<typeof PatternSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
