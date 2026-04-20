import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { IssueReviewSchema, type IssueReviewOutput } from "../validations/issue-review";
import { withAgentRun } from "./run-logger";

const MODEL = "claude-sonnet-4-5-20250929";

export type { IssueReviewOutput };

export interface IssueForReview {
  issue_number: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  severity: string | null;
  labels: string[];
  assigned_to_name: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  days_open: number;
}

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/issue-reviewer.md"),
  "utf8",
).trimEnd();

export async function runIssueReviewer(
  projectName: string,
  issues: IssueForReview[],
): Promise<IssueReviewOutput> {
  // Build a compact summary for the AI
  const issueLines = issues
    .map((i) => {
      const age = i.days_open > 0 ? `${i.days_open}d oud` : "vandaag";
      const assignee = i.assigned_to_name ?? "niet toegewezen";
      const closed = i.closed_at ? ` (gesloten)` : "";
      return `#${i.issue_number} [${i.status}] [${i.priority}] [${i.type}] "${i.title}" — component: ${i.component ?? "onbekend"}, assignee: ${assignee}, ${age}${closed}`;
    })
    .join("\n");

  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  for (const i of issues) {
    statusCounts[i.status] = (statusCounts[i.status] ?? 0) + 1;
    priorityCounts[i.priority] = (priorityCounts[i.priority] ?? 0) + 1;
    typeCounts[i.type] = (typeCounts[i.type] ?? 0) + 1;
  }

  const statsBlock = [
    `Totaal: ${issues.length} issues`,
    `Status: ${Object.entries(statusCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
    `Prioriteit: ${Object.entries(priorityCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
    `Type: ${Object.entries(typeCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
  ].join("\n");

  const userContent = `PROJECT: ${projectName}

--- STATISTIEKEN ---
${statsBlock}

--- ALLE ISSUES ---
${issueLines}`;

  return withAgentRun({ agent_name: "issue-reviewer", model: MODEL }, async () => {
    const { object, usage } = await generateObject({
      model: anthropic(MODEL),
      maxRetries: 3,
      schema: IssueReviewSchema,
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
          content: userContent,
        },
      ],
    });

    return { result: object, usage };
  });
}
