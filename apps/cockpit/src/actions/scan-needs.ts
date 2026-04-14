"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdminInAction } from "@repo/auth/access";
import { scanAllUnscannedMeetings } from "@repo/ai/pipeline/scan-needs";
import { updateNeedStatus } from "@repo/database/mutations/extractions";

export async function scanTeamNeedsAction(): Promise<
  { success: true; scanned: number; needs: number } | { error: string }
> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const result = await scanAllUnscannedMeetings();

  if (result.errors.length > 0) {
    console.error("[scanTeamNeedsAction] Errors:", result.errors);
  }

  revalidatePath("/intelligence/team");
  revalidatePath("/intelligence");
  return { success: true, scanned: result.total_scanned, needs: result.total_needs };
}

const updateNeedStatusSchema = z.object({
  needId: z.string().min(1),
  status: z.enum(["open", "erkend", "afgewezen", "opgelost"]),
});

export async function updateNeedStatusAction(
  input: z.infer<typeof updateNeedStatusSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = updateNeedStatusSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await updateNeedStatus(parsed.data.needId, parsed.data.status);
  if ("error" in result) return result;

  revalidatePath("/intelligence/team");
  revalidatePath("/intelligence");
  return { success: true };
}
