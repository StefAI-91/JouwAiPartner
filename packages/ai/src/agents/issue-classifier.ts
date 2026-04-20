import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  IssueClassifierSchema,
  type IssueClassifierOutput,
} from "../validations/issue-classification";
import { withAgentRun } from "./run-logger";

const MODEL = "claude-haiku-4-5-20251001";

export type { IssueClassifierOutput };

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/issue-classifier.md"),
  "utf8",
).trimEnd();

export async function runIssueClassifier(issue: {
  title: string | null;
  description: string;
  page_url: string | null;
  original_type: string | null;
}): Promise<IssueClassifierOutput> {
  const issueInfo = [
    issue.title ? `Titel: ${issue.title}` : null,
    issue.original_type ? `Origineel type (Userback): ${issue.original_type}` : null,
    issue.page_url ? `Pagina URL: ${issue.page_url}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return withAgentRun({ agent_name: "issue-classifier", model: MODEL }, async () => {
    const { object, usage } = await generateObject({
      model: anthropic(MODEL),
      maxRetries: 3,
      schema: IssueClassifierSchema,
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
          content: `${issueInfo}\n\n--- BESCHRIJVING ---\n${issue.description.slice(0, 4000)}`,
        },
      ],
    });

    return { result: object, usage };
  });
}
