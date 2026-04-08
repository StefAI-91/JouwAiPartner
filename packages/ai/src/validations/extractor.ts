import { z } from "zod";

export const ExtractionItemSchema = z.object({
  type: z.literal("action_item"),
  category: z
    .enum(["wachten_op_extern", "wachten_op_beslissing"])
    .describe(
      "wachten_op_extern: external party must deliver/respond. wachten_op_beslissing: someone must make a decision that blocks work.",
    ),
  content: z.string().describe("The extracted action item in Dutch, concise and clear"),
  confidence: z
    .number()
    .describe(
      "Confidence score 0.0–1.0. Must be between 0 and 1. Set to 0.0 if transcript_ref could not be verified.",
    ),
  transcript_ref: z
    .string()
    .nullable()
    .describe("Exact quote from transcript that supports this extraction. Null if not applicable."),
  follow_up_contact: z
    .string()
    .describe(
      "Name of the person JAIP can email to follow up. Required — if no specific person can be identified, this is not an action item.",
    ),
  assignee: z.string().nullable().describe("Who is responsible for this action item."),
  deadline: z
    .string()
    .nullable()
    .describe(
      "Explicit due date if mentioned in transcript (ISO format YYYY-MM-DD). Null if not explicitly stated.",
    ),
  suggested_deadline: z
    .string()
    .nullable()
    .describe(
      "AI-estimated deadline (ISO format YYYY-MM-DD) when no explicit deadline is mentioned. Based on effort estimate and meeting date.",
    ),
  effort_estimate: z
    .enum(["small", "medium", "large"])
    .describe(
      "Estimated effort: small (simple follow-up), medium (multiple reminders needed), large (complex dependency).",
    ),
  deadline_reasoning: z
    .string()
    .describe(
      "Explanation of how the deadline or suggested_deadline was determined. Mention the cue from transcript or default rule used.",
    ),
  scope: z.enum(["project", "personal"]).nullable().describe("Scope of the action item."),
  project: z.string().nullable().describe("Related project name if applicable. Null otherwise."),
});

export const ExtractorOutputSchema = z.object({
  extractions: z
    .array(ExtractionItemSchema)
    .describe("All action items extracted from the meeting transcript"),
  entities: z.object({
    clients: z.array(z.string()).describe("Client/external organization names mentioned"),
  }),
});

export type ExtractionItem = z.infer<typeof ExtractionItemSchema>;
export type ExtractorOutput = z.infer<typeof ExtractorOutputSchema>;
