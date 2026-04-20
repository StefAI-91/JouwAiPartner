import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { WeeklySummaryOutputSchema, type WeeklySummaryOutput } from "../validations/weekly-summary";
import { withAgentRun } from "./run-logger";

const MODEL = "claude-sonnet-4-5-20250929";

export type { WeeklySummaryOutput };

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/weekly-summarizer.md"),
  "utf8",
).trimEnd();

export interface WeeklyProjectInput {
  project_id: string;
  project_name: string;
  briefing: string | null;
  tasks: {
    title: string;
    status: string;
    assigned_to: string | null;
    due_date: string | null;
  }[];
  meetings_this_week: {
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    summary: string | null;
  }[];
  extractions_this_week: {
    type: string;
    content: string;
  }[];
}

export async function runWeeklySummarizer(
  weekLabel: string,
  projects: WeeklyProjectInput[],
): Promise<WeeklySummaryOutput> {
  const projectsText = projects
    .map((p) => {
      const parts = [`## ${p.project_name}`];

      if (p.briefing) {
        parts.push(`\n**AI Briefing:**\n${p.briefing}`);
      } else {
        parts.push("\n**AI Briefing:** Geen briefing beschikbaar.");
      }

      if (p.tasks.length > 0) {
        parts.push("\n**Taken:**");
        for (const t of p.tasks) {
          const assignee = t.assigned_to ?? "niet toegewezen";
          const due = t.due_date ?? "geen deadline";
          parts.push(`- [${t.status}] ${t.title} (${assignee}, ${due})`);
        }
      } else {
        parts.push("\n**Taken:** Geen taken.");
      }

      if (p.meetings_this_week.length > 0) {
        parts.push("\n**Meetings deze week:**");
        for (const m of p.meetings_this_week) {
          const date = m.date ?? "onbekend";
          const type = m.meeting_type ?? "overig";
          parts.push(`- ${date} (${type}): ${m.title}`);
          if (m.summary) parts.push(`  ${m.summary}`);
        }
      }

      if (p.extractions_this_week.length > 0) {
        parts.push("\n**Nieuwe extracties deze week:**");
        for (const e of p.extractions_this_week) {
          parts.push(`- [${e.type}] ${e.content}`);
        }
      }

      return parts.join("\n");
    })
    .join("\n\n---\n\n");

  const userContent = [
    `Week: ${weekLabel}`,
    `Aantal actieve projecten: ${projects.length}`,
    `\n--- PROJECT DATA ---\n\n${projectsText}`,
  ].join("\n");

  return withAgentRun({ agent_name: "weekly-summarizer", model: MODEL }, async () => {
    const { object, usage } = await generateObject({
      model: anthropic(MODEL),
      schema: WeeklySummaryOutputSchema,
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
