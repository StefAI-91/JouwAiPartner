import { z } from "zod";

export const MEETING_TYPES = [
  "strategy",
  "one_on_one",
  "team_sync",
  "discovery",
  "sales",
  "project_kickoff",
  "status_update",
  "collaboration",
  "other",
] as const;

export type MeetingType = (typeof MEETING_TYPES)[number];

export const GatekeeperSchema = z.object({
  relevance_score: z
    .number()
    .describe(
      "How business-relevant is this meeting? 0.0 = noise, 1.0 = critical. Must be between 0 and 1.",
    ),
  reason: z.string().describe("Brief explanation of the scoring decision (one sentence)"),
  meeting_type: z
    .enum(MEETING_TYPES)
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
