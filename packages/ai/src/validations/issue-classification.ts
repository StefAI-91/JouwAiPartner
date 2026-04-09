import { z } from "zod";

export const ISSUE_TYPES = ["bug", "feature_request", "question"] as const;
export const COMPONENTS = [
  "frontend",
  "backend",
  "api",
  "database",
  "prompt_ai",
  "unknown",
] as const;
export const SEVERITIES = ["critical", "high", "medium", "low"] as const;

export const IssueClassifierSchema = z.object({
  type: z
    .enum(ISSUE_TYPES)
    .describe(
      "bug = iets werkt niet/is kapot, feature_request = iets nieuws gewenst/verbetering, question = vraag/onduidelijkheid/verwarring",
    ),
  component: z
    .enum(COMPONENTS)
    .describe(
      "Welk technisch onderdeel is betrokken. Gebruik pageUrl als hint (bijv. /dashboard = frontend)",
    ),
  severity: z
    .enum(SEVERITIES)
    .describe(
      "critical = app onbruikbaar/dataverlies, high = belangrijke functie broken, medium = bug met workaround, low = cosmetisch/nice-to-have",
    ),
  repro_steps: z
    .string()
    .describe(
      "Concrete reproductiestappen in het Nederlands. Als info ontbreekt, geef aan wat er mist",
    ),
  confidence: z.number().describe("Hoe zeker ben je van deze classificatie (0.0-1.0)"),
});

export type IssueClassifierOutput = z.infer<typeof IssueClassifierSchema>;
