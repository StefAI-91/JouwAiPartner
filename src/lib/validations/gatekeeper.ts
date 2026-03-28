import { z } from "zod";

export const GatekeeperSchema = z.object({
  relevance_score: z
    .number()
    .describe(
      "How business-relevant is this content? 0.0 = noise, 1.0 = critical. Must be between 0 and 1.",
    ),
  action: z.enum(["pass", "reject"]).describe("pass if relevance_score >= 0.6, reject if < 0.6"),
  reason: z.string().describe("Brief explanation of the scoring decision (one sentence)"),
  category: z
    .array(z.enum(["decision", "context", "action_item", "reference", "insight"]))
    .describe("One or more content categories that apply"),

  entities: z.object({
    people: z.array(z.string()).describe("People mentioned by name"),
    projects: z.array(z.string()).describe("Projects discussed"),
    clients: z.array(z.string()).describe("Clients mentioned"),
    topics: z.array(z.string()).describe("Key topics/themes"),
  }),

  decisions: z
    .array(
      z.object({
        decision: z.string().describe("What was concretely decided"),
        made_by: z.string().describe("Who made or announced the decision"),
      }),
    )
    .describe("Concrete decisions made in the meeting"),

  action_items: z
    .array(
      z.object({
        description: z.string().describe("What needs to be done"),
        assignee: z.string().describe("Who is responsible"),
        deadline: z
          .string()
          .nullable()
          .describe("Due date if mentioned (ISO format or natural language)"),
        scope: z
          .enum(["project", "personal"])
          .describe("project if related to a project, personal otherwise"),
        project: z.string().nullable().describe("Project name if scope is project"),
      }),
    )
    .describe("Action items with assignee and optional deadline"),

  project_updates: z
    .array(
      z.object({
        project: z.string().describe("Project name"),
        status: z.string().describe("Current status or update"),
        blockers: z.array(z.string()).describe("Any blockers mentioned"),
      }),
    )
    .describe("Status updates for projects discussed"),

  strategy_ideas: z.array(z.string()).describe("New strategic directions or brainstorm ideas"),

  client_info: z
    .array(
      z.object({
        client: z.string().describe("Client name"),
        note: z.string().describe("What was said about or on behalf of this client"),
      }),
    )
    .describe("Information about or from clients"),
});

export type GatekeeperOutput = z.infer<typeof GatekeeperSchema>;
