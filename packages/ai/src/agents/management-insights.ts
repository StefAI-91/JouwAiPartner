import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ManagementInsightsOutputSchema,
  type ManagementInsightsOutput,
} from "../validations/management-insights";
import { withAgentRun } from "./run-logger";

const MODEL = "claude-sonnet-4-5-20250929";

export type { ManagementInsightsOutput };

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/management-insights.md"),
  "utf8",
).trimEnd();

export interface ManagementMeetingInput {
  title: string | null;
  date: string | null;
  summary: string | null;
  participants: string[];
}

export async function runManagementInsightsAgent(
  meetings: ManagementMeetingInput[],
): Promise<ManagementInsightsOutput> {
  const meetingsText = meetings
    .map((m, i) => {
      const parts = [`## ${i + 1}. ${m.title ?? "(geen titel)"}`];
      parts.push(`**Datum:** ${m.date ?? "onbekend"}`);
      parts.push(`**Deelnemers:** ${m.participants.join(", ") || "onbekend"}`);
      if (m.summary) {
        parts.push(`\n${m.summary}`);
      } else {
        parts.push("\n_Geen samenvatting beschikbaar._");
      }
      return parts.join("\n");
    })
    .join("\n\n---\n\n");

  const userContent = [
    `Aantal management meetings: ${meetings.length}`,
    `Periode: ${meetings[meetings.length - 1]?.date ?? "?"} t/m ${meetings[0]?.date ?? "?"}`,
    `\n--- MEETING SAMENVATTINGEN ---\n\n${meetingsText}`,
  ].join("\n");

  return withAgentRun({ agent_name: "management-insights", model: MODEL }, async () => {
    const { object, usage } = await generateObject({
      model: anthropic(MODEL),
      schema: ManagementInsightsOutputSchema,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        { role: "user", content: userContent },
      ],
    });

    return { result: object, usage };
  });
}
