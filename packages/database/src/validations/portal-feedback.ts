import { z } from "zod";
import { ISSUE_TYPES } from "../constants/issues";

/**
 * Portal feedback submission — strenger dan `createIssueSchema`:
 * korte of lege omschrijvingen leveren niks bruikbaars op voor het team, dus
 * dwingen we een minimale lengte af zodat de klant ook echt iets kwijt kan.
 */
export const portalFeedbackSchema = z.object({
  project_id: z.string().uuid("Ongeldig project"),
  title: z.string().trim().min(5, "Titel moet minstens 5 tekens zijn").max(500, "Titel is te lang"),
  description: z
    .string()
    .trim()
    .min(10, "Beschrijving moet minstens 10 tekens zijn")
    .max(10000, "Beschrijving is te lang"),
  type: z.enum(ISSUE_TYPES),
});

export type PortalFeedbackInput = z.infer<typeof portalFeedbackSchema>;
