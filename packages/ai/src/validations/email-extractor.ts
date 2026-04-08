import { z } from "zod";

export const EmailExtractionItemSchema = z.object({
  type: z
    .enum(["decision", "action_item", "need", "insight", "project_update", "request"])
    .describe(
      "Type of extraction: decision, action_item, need (something missing/blocking), insight (useful info), project_update (status/progress), request (someone asks for something)",
    ),
  content: z.string().describe("The extracted insight in Dutch, concise and clear"),
  confidence: z.number().describe("Confidence score 0.0-1.0. Must be between 0 and 1."),
  source_ref: z
    .string()
    .nullable()
    .describe(
      "Relevant quote from the email body that supports this extraction. Null if not applicable.",
    ),
  project: z.string().nullable().describe("Related project name if applicable. Null otherwise."),
  assignee: z.string().nullable().describe("Who is responsible or mentioned. Null if unclear."),
  urgency: z
    .enum(["low", "medium", "high"])
    .describe("How urgent is this item based on email tone and content"),
});

export const EmailExtractorOutputSchema = z.object({
  extractions: z
    .array(EmailExtractionItemSchema)
    .describe("All relevant insights extracted from the email"),
  summary: z.string().describe("One-sentence Dutch summary of what this email is about"),
});

export type EmailExtractionItem = z.infer<typeof EmailExtractionItemSchema>;
export type EmailExtractorOutput = z.infer<typeof EmailExtractorOutputSchema>;
