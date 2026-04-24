"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { isAdmin } from "@repo/auth/access";
import {
  linkSegmentToProject,
  removeSegmentTag,
} from "@repo/database/mutations/meeting-project-summaries";
import { getSegmentNameRaw } from "@repo/database/queries/meetings/project-summaries";
import { getMeetingOrganizationId } from "@repo/database/queries/meetings";
import { getProjectAliases } from "@repo/database/queries/projects";
import { updateProjectAliases } from "@repo/database/mutations/projects";
import { addIgnoredEntity } from "@repo/database/mutations/ignored-entities";

const linkSegmentSchema = z.object({
  segmentId: z.string().uuid(),
  projectId: z.string().uuid(),
  meetingId: z.string().uuid(),
});

const removeTagSchema = z.object({
  segmentId: z.string().uuid(),
  meetingId: z.string().uuid(),
});

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!(await isAdmin(user.id))) return null;
  return user;
}

export async function linkSegmentToProjectAction(
  input: z.infer<typeof linkSegmentSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = linkSegmentSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const user = await requireAuth();
  if (!user) return { error: "Niet ingelogd" };

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
    const currentAliases = await getProjectAliases(parsed.data.projectId);
    if (currentAliases !== null) {
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

  const user = await requireAuth();
  if (!user) return { error: "Niet ingelogd" };

  // Get project_name_raw and meeting org_id before removing (for ignored_entity feedback)
  const nameRaw = await getSegmentNameRaw(parsed.data.segmentId);
  const orgId = await getMeetingOrganizationId(parsed.data.meetingId);

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
