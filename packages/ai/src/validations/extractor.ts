import { z } from "zod";

export const ExtractionItemSchema = z.object({
  type: z.literal("action_item"),
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
  assignee: z.string().nullable().describe("Who is responsible for this action item."),
  deadline: z.string().nullable().describe("Due date if mentioned. Null otherwise."),
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
