"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { updateMeetingTitle, deleteMeeting } from "@repo/database/mutations/meetings";
import { regenerateSchema } from "@repo/database/validations/meetings";
import { deleteSchema } from "@repo/database/validations/entities";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

export async function regenerateMeetingTitleAction(
  input: z.infer<typeof regenerateSchema>,
): Promise<{ success: true; title: string } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const { getMeetingForTitleGeneration } = await import("@repo/database/queries/meetings");
  const meeting = await getMeetingForTitleGeneration(parsed.data.meetingId);
  if (!meeting) return { error: "Meeting niet gevonden" };

  const { generateMeetingTitle } = await import("@repo/ai/pipeline/lib/title-builder");

  const orgName = meeting.organization?.name ?? null;
  const projectName = meeting.meeting_projects?.[0]?.project?.name ?? null;

  const summary = meeting.summary ?? "";
  if (!summary) return { error: "Geen samenvatting beschikbaar voor titelgeneratie" };

  const title = await generateMeetingTitle(summary, {
    meetingType: meeting.meeting_type ?? "other",
    partyType: meeting.party_type ?? "other",
    organizationName: orgName,
    projectName,
  });

  const result = await updateMeetingTitle(parsed.data.meetingId, title);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath("/meetings");
  revalidatePath("/");
  return { success: true, title };
}

export async function deleteMeetingAction(
  input: z.infer<typeof deleteSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await deleteMeeting(parsed.data.id);
  if ("error" in result) return result;

  revalidatePath("/meetings");
  revalidatePath("/review");
  revalidatePath("/");
  return { success: true };
}
