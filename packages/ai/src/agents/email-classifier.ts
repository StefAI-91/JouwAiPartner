import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { EmailClassifierSchema, EmailClassifierOutput } from "../validations/email-classifier";
import { withAgentRun } from "./run-logger";

const MODEL = "claude-haiku-4-5-20251001";

export type { EmailClassifierOutput };

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/email-classifier.md"),
  "utf8",
).trimEnd();

/**
 * Run the Email Classifier agent on an email.
 * Uses Haiku for fast, cost-effective classification (same as meeting Gatekeeper).
 */
export async function runEmailClassifier(
  email: {
    subject: string | null;
    from_address: string;
    from_name: string | null;
    to_addresses: string[];
    body_text: string | null;
    snippet: string;
    date: string;
  },
  context: {
    entityContext?: string;
  } = {},
): Promise<EmailClassifierOutput> {
  const emailInfo = [
    `Onderwerp: ${email.subject ?? "(geen onderwerp)"}`,
    `Van: ${email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}`,
    `Aan: ${email.to_addresses.join(", ")}`,
    `Datum: ${email.date}`,
  ].join("\n");

  const body = email.body_text ? email.body_text.slice(0, 4000) : email.snippet;

  const entitySection = context.entityContext ? `\n\n${context.entityContext}` : "";

  return withAgentRun({ agent_name: "email-classifier", model: MODEL }, async () => {
    const { object, usage } = await generateObject({
      model: anthropic(MODEL),
      maxRetries: 3,
      schema: EmailClassifierSchema,
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
          content: `${emailInfo}${entitySection}\n\n--- EMAIL BODY ---\n${body}`,
        },
      ],
    });

    return { result: object, usage };
  });
}
