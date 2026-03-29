import { z } from "zod";

export const GatekeeperSchema = z.object({
  relevance_score: z
    .number()
    .describe(
      "How business-relevant is this meeting? 0.0 = noise, 1.0 = critical. Must be between 0 and 1.",
    ),
  reason: z.string().describe("Brief explanation of the scoring decision (one sentence)"),
  meeting_type: z
    .enum([
      "standup",
      "sprint_review",
      "strategy",
      "client_call",
      "internal",
      "one_on_one",
      "other",
    ])
    .describe("The type/format of this meeting"),
  party_type: z
    .enum(["client", "partner", "internal", "other"])
    .describe("Who was the meeting with? client/partner/internal/other"),
  organization_name: z
    .string()
    .nullable()
    .describe(
      "Name of the external organization involved (client/partner). Null if internal-only meeting.",
    ),
});

export type GatekeeperOutput = z.infer<typeof GatekeeperSchema>;
