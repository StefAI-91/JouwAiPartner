import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NeedsScannerOutputSchema, NeedsScannerOutput } from "../validations/needs-scanner";

export type { NeedsScannerOutput };

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/needs-scanner.md"),
  "utf8",
).trimEnd();

/**
 * Run the Needs Scanner on a meeting summary.
 * Uses Haiku 4.5 for cost efficiency — only reads summaries, not full transcripts.
 */
export async function runNeedsScanner(
  summary: string,
  context: {
    title: string;
    meeting_type: string;
    meeting_date: string;
    participants: string[];
  },
): Promise<NeedsScannerOutput> {
  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Datum: ${context.meeting_date}`,
    `Deelnemers: ${context.participants.join(", ")}`,
  ].join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
    schema: NeedsScannerOutputSchema,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      {
        role: "user",
        content: `${contextPrefix}\n\n--- SAMENVATTING ---\n${summary}`,
      },
    ],
  });

  return object;
}
