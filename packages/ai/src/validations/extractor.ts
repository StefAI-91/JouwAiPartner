import { z } from "zod";

export const ExtractionItemSchema = z.object({
  type: z.enum(["decision", "action_item", "need", "insight"]),
  content: z.string().describe("The extracted content in Dutch, concise and clear"),
  confidence: z
    .number()
    .describe(
      "Confidence score 0.0–1.0. Must be between 0 and 1. Set to 0.0 if transcript_ref could not be verified.",
    ),
  transcript_ref: z
    .string()
    .nullable()
    .describe("Exact quote from transcript that supports this extraction. Null if not applicable."),
  assignee: z.string().nullable().describe("Who is responsible (for action_item). Null otherwise."),
  deadline: z
    .string()
    .nullable()
    .describe("Due date if mentioned (for action_item). Null otherwise."),
  scope: z
    .enum(["project", "personal"])
    .nullable()
    .describe("Scope of the action item. Null for non-action_items."),
  project: z.string().nullable().describe("Related project name if applicable. Null otherwise."),
  made_by: z
    .string()
    .nullable()
    .describe("Who made the decision (for decision type). Null otherwise."),
  client: z.string().nullable().describe("Client name (for need type). Null otherwise."),
  urgency: z
    .enum(["high", "medium", "low"])
    .nullable()
    .describe("Urgency level (for need type). Null otherwise."),
  category: z
    .enum([
      "strategic",
      "market_signal",
      "client_feedback",
      "technical",
      "people",
      "risk",
      "growth",
    ])
    .nullable()
    .describe("Insight category (for insight type). Null otherwise."),
});

export const ExtractorOutputSchema = z.object({
  extractions: z
    .array(ExtractionItemSchema)
    .describe("All extracted items from the meeting transcript"),
  entities: z.object({
    projects: z.array(z.string()).describe("Project names mentioned in the meeting"),
    clients: z.array(z.string()).describe("Client/external organization names mentioned"),
  }),
  primary_project: z
    .string()
    .nullable()
    .describe("The main project discussed in this meeting, if any"),
});

export type ExtractionItem = z.infer<typeof ExtractionItemSchema>;
export type ExtractorOutput = z.infer<typeof ExtractorOutputSchema>;
