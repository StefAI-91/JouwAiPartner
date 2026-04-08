import { z } from "zod";

export const EmailClassifierSchema = z.object({
  relevance_score: z
    .number()
    .describe(
      "How business-relevant is this email? 0.0 = noise/newsletter, 1.0 = critical project communication. Must be between 0 and 1.",
    ),
  reason: z.string().describe("Brief explanation of the scoring decision (one sentence)"),
  organization_name: z
    .string()
    .nullable()
    .describe(
      "Name of the external organization the sender/recipients belong to. Null if internal.",
    ),
  identified_projects: z
    .array(
      z.object({
        project_name: z.string().describe("Project name as matched or mentioned in email"),
        project_id: z
          .string()
          .nullable()
          .describe("UUID if matched to a known project, null if unknown"),
        confidence: z.number().describe("Confidence score 0.0-1.0 for this project match"),
      }),
    )
    .describe("Projects this email relates to. Match to known projects when confident."),
  email_category: z
    .enum([
      "project_communication",
      "sales",
      "internal",
      "administrative",
      "newsletter",
      "notification",
      "other",
    ])
    .describe("The category of this email"),
});

export type EmailClassifierOutput = z.infer<typeof EmailClassifierSchema>;
