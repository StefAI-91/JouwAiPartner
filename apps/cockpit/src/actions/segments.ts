"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import {
  linkSegmentToProject,
  removeSegmentTag,
} from "@repo/database/mutations/meeting-project-summaries";

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
  return user;
}

export async function linkSegmentToProjectAction(
  input: z.infer<typeof linkSegmentSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = linkSegmentSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const user = await requireAuth();
  if (!user) return { error: "Niet ingelogd" };

  const result = await linkSegmentToProject(parsed.data.segmentId, parsed.data.projectId);
  if ("error" in result) return result;

  revalidatePath(`/review/${parsed.data.meetingId}`);
  return { success: true };
}

export async function removeSegmentTagAction(
  input: z.infer<typeof removeTagSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = removeTagSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const user = await requireAuth();
  if (!user) return { error: "Niet ingelogd" };

  const result = await removeSegmentTag(parsed.data.segmentId, parsed.data.meetingId);
  if ("error" in result) return result;

  revalidatePath(`/review/${parsed.data.meetingId}`);
  return { success: true };
}
