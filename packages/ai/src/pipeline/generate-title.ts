import { MEETING_TYPE_PREFIX } from "@repo/database/constants/meetings";
import { generateMeetingSubject } from "../agents/title-generator";

export interface TitleContext {
  meetingType: string;
  partyType: string;
  organizationName: string | null;
  projectName: string | null;
}

/**
 * Build a formatted meeting title from prefix, context, and subject.
 * Format: (Prefix): [Org / Project →] Subject
 *
 * - Internal meetings: no org/project in title
 * - External with org + project: (Prefix): Org / Project → Subject
 * - External with org only: (Prefix): Org → Subject
 * - External with project only: (Prefix): Project → Subject
 * - External without context: (Prefix): Subject
 */
export function buildMeetingTitle(subject: string, context: TitleContext): string {
  const prefix = MEETING_TYPE_PREFIX[context.meetingType] ?? "Overig";

  // Internal meetings: no org/project context
  if (context.partyType === "internal") {
    return `(${prefix}): ${subject}`;
  }

  // External meetings: add org/project context
  const org = context.organizationName;
  const project = context.projectName;

  if (org && project) {
    return `(${prefix}): ${org} / ${project} → ${subject}`;
  }
  if (org) {
    return `(${prefix}): ${org} → ${subject}`;
  }
  if (project) {
    return `(${prefix}): ${project} → ${subject}`;
  }

  return `(${prefix}): ${subject}`;
}

/**
 * Generate a complete meeting title: AI subject + formatted prefix and context.
 */
export async function generateMeetingTitle(
  summary: string,
  context: TitleContext,
): Promise<string> {
  const subject = await generateMeetingSubject(summary);
  return buildMeetingTitle(subject, context);
}
