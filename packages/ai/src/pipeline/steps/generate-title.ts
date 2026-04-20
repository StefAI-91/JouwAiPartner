import { generateMeetingTitle } from "../generate-title";
import { updateMeetingTitle } from "@repo/database/mutations/meetings";
import type { IdentifiedProject } from "../../validations/gatekeeper";

export interface GenerateTitleStepInput {
  meetingId: string;
  richSummary: string | null;
  fallbackSummary: string;
  meetingType: string;
  partyType: string;
  organizationName: string | null;
  projects: { id: string; name: string }[];
  identifiedProjects: IdentifiedProject[];
}

export interface GenerateTitleStepResult {
  success: boolean;
  title: string | null;
  error: string | null;
}

/**
 * Generate an AI title from the rich summary and persist it to the
 * meeting row. Non-blocking: returns error info instead of throwing.
 */
export async function runGenerateTitleStep(
  input: GenerateTitleStepInput,
): Promise<GenerateTitleStepResult> {
  try {
    const firstProject = input.identifiedProjects.find((p) => p.project_id !== null);
    const projectName = firstProject
      ? (input.projects.find((p) => p.id === firstProject.project_id)?.name ?? null)
      : null;

    const titleSummary = input.richSummary ?? input.fallbackSummary;
    const generatedTitle = await generateMeetingTitle(titleSummary, {
      meetingType: input.meetingType,
      partyType: input.partyType,
      organizationName: input.organizationName,
      projectName,
    });

    await updateMeetingTitle(input.meetingId, generatedTitle);
    console.info(`Title generated: ${generatedTitle}`);
    return { success: true, title: generatedTitle, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Title generation failed (non-blocking):", msg);
    return { success: false, title: null, error: msg };
  }
}
