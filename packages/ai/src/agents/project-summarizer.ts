import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ProjectSummaryOutputSchema,
  OrgSummaryOutputSchema,
  type ProjectSummaryOutput,
  type OrgSummaryOutput,
} from "../validations/project-summary";
import { withAgentRun } from "./run-logger";

const MODEL = "claude-haiku-4-5-20251001";

export type { ProjectSummaryOutput, OrgSummaryOutput };

const PROMPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts");
const PROJECT_SYSTEM_PROMPT = readFileSync(
  resolve(PROMPTS_DIR, "project-summarizer.md"),
  "utf8",
).trimEnd();
const ORG_SYSTEM_PROMPT = readFileSync(resolve(PROMPTS_DIR, "org-summarizer.md"), "utf8").trimEnd();

export interface MeetingInput {
  title: string | null;
  date: string | null;
  meetingType: string | null;
  briefing: string | null;
  summary: string | null;
}

export interface EmailInput {
  subject: string | null;
  date: string;
  from: string;
  snippet: string | null;
}

export interface SegmentInput {
  meeting_title: string | null;
  meeting_date: string | null;
  kernpunten: string[];
  vervolgstappen: string[];
}

function formatMeetings(meetings: MeetingInput[]): string {
  if (meetings.length === 0) return "Geen meetings beschikbaar.";

  return meetings
    .map((m) => {
      const header = [m.title, m.date, m.meetingType].filter(Boolean).join(" — ");

      const content = m.briefing || m.summary || "Geen samenvatting beschikbaar";

      return `### ${header}\n${content}`;
    })
    .join("\n\n");
}

function formatEmails(emails: EmailInput[]): string {
  if (emails.length === 0) return "";

  return emails
    .map((e) => {
      const header = [e.subject, e.date, `van ${e.from}`].filter(Boolean).join(" — ");
      const content = e.snippet || "Geen preview beschikbaar";
      return `### ${header}\n${content}`;
    })
    .join("\n\n");
}

function formatSegments(segments: SegmentInput[]): string {
  if (segments.length === 0) return "";

  const lines = segments.map((s) => {
    const header = [s.meeting_title, s.meeting_date].filter(Boolean).join(" — ");
    const parts: string[] = [`### ${header || "Meeting"}`];
    if (s.kernpunten.length > 0) {
      parts.push("Kernpunten:");
      s.kernpunten.forEach((k) => parts.push(`- ${k}`));
    }
    if (s.vervolgstappen.length > 0) {
      parts.push("Vervolgstappen:");
      s.vervolgstappen.forEach((v) => parts.push(`- ${v}`));
    }
    return parts.join("\n");
  });

  return lines.join("\n\n");
}

export async function runProjectSummarizer(
  projectName: string,
  meetings: MeetingInput[],
  existingContext?: string | null,
  segments?: SegmentInput[],
  emails?: EmailInput[],
): Promise<ProjectSummaryOutput> {
  const meetingsText = formatMeetings(meetings);
  const segmentsText = segments?.length ? formatSegments(segments) : "";
  const emailsText = emails?.length ? formatEmails(emails) : "";

  const userContent = [
    `Project: ${projectName}`,
    `Aantal meetings: ${meetings.length}`,
    emails?.length ? `Aantal emails: ${emails.length}` : "",
    existingContext ? `\nHuidige context samenvatting:\n${existingContext}` : "",
    segmentsText
      ? `\n--- PROJECT-SPECIFIEKE KERNPUNTEN (per meeting) ---\nDit zijn de kernpunten en vervolgstappen die specifiek over dit project gaan. Gebruik deze als primaire bron — ze bevatten minder ruis dan de volledige meeting-samenvattingen.\n\n${segmentsText}`
      : "",
    meetingsText ? `\n--- MEETING SAMENVATTINGEN ---\n${meetingsText}` : "",
    emailsText ? `\n--- EMAIL COMMUNICATIE ---\n${emailsText}` : "",
  ].join("\n");

  return withAgentRun({ agent_name: "project-summarizer", model: MODEL }, async () => {
    const { object, usage } = await generateObject({
      model: anthropic(MODEL),
      maxRetries: 3,
      schema: ProjectSummaryOutputSchema,
      messages: [
        {
          role: "system",
          content: PROJECT_SYSTEM_PROMPT,
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

export async function runOrgSummarizer(
  orgName: string,
  meetings: MeetingInput[],
  existingContext?: string | null,
  emails?: EmailInput[],
  projectCount: number = 0,
): Promise<OrgSummaryOutput> {
  const meetingsText = formatMeetings(meetings);
  const emailsText = emails?.length ? formatEmails(emails) : "";

  const userContent = [
    `Organisatie: ${orgName}`,
    `Aantal gekoppelde projecten: ${projectCount}`,
    `Aantal meetings: ${meetings.length}`,
    emails?.length ? `Aantal emails: ${emails.length}` : "",
    existingContext ? `\nHuidige context samenvatting:\n${existingContext}` : "",
    meetingsText ? `\n--- MEETING SAMENVATTINGEN ---\n${meetingsText}` : "",
    emailsText ? `\n--- EMAIL COMMUNICATIE ---\n${emailsText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return withAgentRun({ agent_name: "org-summarizer", model: MODEL }, async () => {
    const { object, usage } = await generateObject({
      model: anthropic(MODEL),
      maxRetries: 3,
      schema: OrgSummaryOutputSchema,
      messages: [
        {
          role: "system",
          content: ORG_SYSTEM_PROMPT,
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
