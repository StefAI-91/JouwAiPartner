"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { updateActionItemAssignment } from "@repo/database/mutations/action-items";

// ── Zod Schema ──

const updateAssignmentSchema = z.object({
  extractionId: z.string().uuid(),
  assignedTo: z.string().uuid().nullable(),
  dueDate: z.string().nullable(),
});

// ── Action ──

export async function updateActionItemAssignmentAction(
  input: z.infer<typeof updateAssignmentSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = updateAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ongeldige invoer" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const result = await updateActionItemAssignment(
    parsed.data.extractionId,
    {
      assigned_to: parsed.data.assignedTo,
      due_date: parsed.data.dueDate,
    },
    supabase,
  );

  if ("error" in result) return result;

  revalidatePath("/");
  revalidatePath("/meetings");
  return { success: true };
}
