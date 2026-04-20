import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

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
  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
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

  return object.subject;
}
