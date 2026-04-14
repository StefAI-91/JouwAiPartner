"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdminInAction } from "@repo/auth/access";
import {
  linkSegmentToProject,
  removeSegmentTag,
} from "@repo/database/mutations/meeting-project-summaries";
import { updateProjectAliases } from "@repo/database/mutations/projects";
import { addIgnoredEntity } from "@repo/database/mutations/ignored-entities";
import { getAdminClient } from "@repo/database/supabase/admin";

const linkSegmentSchema = z.object({
  segmentId: z.string().uuid(),
  projectId: z.string().uuid(),
  meetingId: z.string().uuid(),
});

const removeTagSchema = z.object({
  segmentId: z.string().uuid(),
  meetingId: z.string().uuid(),
});

/**
 * Get segment's project_name_raw for feedback actions.
 */
async function getSegmentNameRaw(segmentId: string): Promise<string | null> {
  const { data } = await getAdminClient()
    .from("meeting_project_summaries")
    .select("project_name_raw")
    .eq("id", segmentId)
    .single();
  return data?.project_name_raw ?? null;
}

/**
 * Get meeting's organization_id for ignored_entities.
 */
async function getMeetingOrgId(meetingId: string): Promise<string | null> {
  const { data } = await getAdminClient()
    .from("meetings")
    .select("organization_id")
    .eq("id", meetingId)
    .single();
  return data?.organization_id ?? null;
}

export async function linkSegmentToProjectAction(
  input: z.infer<typeof linkSegmentSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = linkSegmentSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  // Get project_name_raw before linking (for alias feedback)
  const nameRaw = await getSegmentNameRaw(parsed.data.segmentId);

  console.info("[linkSegmentToProjectAction]", {
    segmentId: parsed.data.segmentId,
    projectId: parsed.data.projectId,
    meetingId: parsed.data.meetingId,
    nameRaw,
  });

  const result = await linkSegmentToProject(parsed.data.segmentId, parsed.data.projectId);
  if ("error" in result) {
    console.error("[linkSegmentToProjectAction] Failed:", result.error);
    return result;
  }
  console.info("[linkSegmentToProjectAction] Success");

  // FUNC-090: Auto-add project_name_raw as alias to the project
  if (nameRaw) {
    const { data: project } = await getAdminClient()
      .from("projects")
      .select("aliases")
      .eq("id", parsed.data.projectId)
      .single();

    if (project) {
      const currentAliases: string[] = project.aliases ?? [];
      const alreadyExists = currentAliases.some((a) => a.toLowerCase() === nameRaw.toLowerCase());
      if (!alreadyExists) {
        await updateProjectAliases(parsed.data.projectId, [...currentAliases, nameRaw]);
      }
    }
  }

  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  return { success: true };
}

export async function removeSegmentTagAction(
  input: z.infer<typeof removeTagSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = removeTagSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  // Get project_name_raw and meeting org_id before removing (for ignored_entity feedback)
  const nameRaw = await getSegmentNameRaw(parsed.data.segmentId);
  const orgId = await getMeetingOrgId(parsed.data.meetingId);

  const result = await removeSegmentTag(parsed.data.segmentId, parsed.data.meetingId);
  if ("error" in result) return result;

  // FUNC-091: Auto-add project_name_raw to ignored_entities
  if (nameRaw && orgId) {
    const ignoreResult = await addIgnoredEntity(orgId, nameRaw, "project");
    if ("error" in ignoreResult) {
      console.error("Failed to add ignored entity:", ignoreResult.error);
    }
  } else if (nameRaw && !orgId) {
    console.warn("Cannot add ignored entity: meeting has no organization_id");
  }

  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  return { success: true };
}
