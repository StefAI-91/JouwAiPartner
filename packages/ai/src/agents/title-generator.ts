import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { withAgentRun } from "./run-logger";

const MODEL = "claude-haiku-4-5-20251001";

const TitleSubjectSchema = z.object({
  subject: z
    .string()
    .describe("Kort, informatief onderwerp van de meeting (max 50 tekens, Nederlands)"),
});

export type TitleSubjectOutput = z.infer<typeof TitleSubjectSchema>;

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/title-generator.md"),
  "utf8",
).trimEnd();

export async function generateMeetingSubject(summary: string): Promise<string> {
  return withAgentRun({ agent_name: "title-generator", model: MODEL }, async () => {
    const { object, usage } = await generateObject({
      model: anthropic(MODEL),
      maxRetries: 2,
      schema: TitleSubjectSchema,
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
          content: `Genereer een kort onderwerp voor deze meeting:\n\n${summary.slice(0, 2000)}`,
        },
      ],
    });

    return { result: object.subject, usage };
  });
}
