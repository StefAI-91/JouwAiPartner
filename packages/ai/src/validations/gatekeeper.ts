import { z } from "zod";

export const MEETING_TYPES = [
  "strategy",
  "one_on_one",
  "team_sync",
  "board",
  "discovery",
  "sales",
  "project_kickoff",
  "status_update",
  "collaboration",
  "other",
] as const;

export type MeetingType = (typeof MEETING_TYPES)[number];

export const PARTY_TYPES = ["client", "partner", "internal", "other"] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const IdentifiedProjectSchema = z.object({
  project_name: z.string().describe("Project name as matched to DB or mentioned in transcript"),
  project_id: z.string().nullable().describe("UUID if matched to a known project, null if unknown"),
  confidence: z.number().describe("Confidence score 0.0-1.0 for this project identification"),
});

export type IdentifiedProject = z.infer<typeof IdentifiedProjectSchema>;

export const GatekeeperSchema = z.object({
  relevance_score: z
    .number()
    .describe(
      "How business-relevant is this meeting? 0.0 = noise, 1.0 = critical. Must be between 0 and 1.",
    ),
  reason: z.string().describe("Brief explanation of the scoring decision (one sentence)"),
  meeting_type: z.enum(MEETING_TYPES).describe("The type/format of this meeting"),
  organization_name: z
    .string()
    .nullable()
    .describe(
      "Name of the external organization involved. Null if internal-only meeting or if already known.",
    ),
  identified_projects: z
    .array(IdentifiedProjectSchema)
    .describe(
      "Projects discussed in this meeting. Match to known projects when confident, otherwise use project_id: null.",
    ),
});

export type GatekeeperOutput = z.infer<typeof GatekeeperSchema>;
