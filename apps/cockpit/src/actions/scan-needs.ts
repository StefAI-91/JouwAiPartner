"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { scanAllUnscannedMeetings } from "@repo/ai/pipeline/scan-needs";

export async function scanTeamNeedsAction(): Promise<
  { success: true; scanned: number; needs: number } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const result = await scanAllUnscannedMeetings();

  if (result.errors.length > 0) {
    console.error("[scanTeamNeedsAction] Errors:", result.errors);
  }

  revalidatePath("/intelligence/team");
  revalidatePath("/intelligence");
  return { success: true, scanned: result.total_scanned, needs: result.total_needs };
}
