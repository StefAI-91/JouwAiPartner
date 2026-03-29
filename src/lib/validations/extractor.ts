import { z } from "zod";

export const ExtractionItemSchema = z.object({
  type: z.enum(["decision", "action_item", "need", "insight"]),
  content: z.string().describe("The extracted content in Dutch, concise and clear"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score 0.0–1.0. Set to 0.0 if transcript_ref could not be verified."),
  transcript_ref: z
    .string()
    .nullable()
    .describe("Exact quote from transcript that supports this extraction. Null if not applicable."),
  metadata: z
    .record(z.string(), z.unknown())
    .describe(
      "Type-specific metadata. For action_item: {assignee, deadline, scope, project}. For decision: {made_by}. For need: {client, urgency}. For insight: {category}.",
    ),
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
