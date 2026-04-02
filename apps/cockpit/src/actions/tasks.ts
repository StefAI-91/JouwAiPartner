"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import {
  createTaskFromExtraction,
  updateTask,
  completeTask,
  dismissTask,
} from "@repo/database/mutations/tasks";
import { hasTaskForExtraction } from "@repo/database/queries/tasks";

// ── Zod Schemas ──

const optionalStringOrNull = z.string().nullable().optional();
const optionalDateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldig datumformaat (YYYY-MM-DD)")
  .nullable()
  .optional();

const promoteToTaskSchema = z.object({
  extractionId: z.string().uuid(),
  title: z.string().min(1),
  assignedTo: optionalStringOrNull,
  dueDate: optionalDateOrNull,
});

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  assignedTo: optionalStringOrNull,
  dueDate: optionalDateOrNull,
  title: z.string().min(1).optional(),
});

const taskIdSchema = z.object({
  taskId: z.string().uuid(),
});

// ── Helpers ──

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Actions ──

export async function promoteToTaskAction(
  input: z.infer<typeof promoteToTaskSchema>,
): Promise<{ success: true; id: string } | { error: string }> {
  const parsed = promoteToTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: "Niet ingelogd" };

  const supabase = await createClient();

  // Prevent duplicate tasks for the same extraction
  const alreadyExists = await hasTaskForExtraction(parsed.data.extractionId, supabase);
  if (alreadyExists) return { error: "Er bestaat al een taak voor dit actiepunt" };

  const result = await createTaskFromExtraction(
    {
      extraction_id: parsed.data.extractionId,
      title: parsed.data.title,
      assigned_to: parsed.data.assignedTo || null,
      due_date: parsed.data.dueDate || null,
      created_by: userId,
    },
    supabase,
  );

  if ("error" in result) return result;

  revalidatePath("/");
  revalidatePath("/meetings");
  return result;
}

export async function updateTaskAction(
  input: z.infer<typeof updateTaskSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: "Niet ingelogd" };

  const supabase = await createClient();
  const result = await updateTask(
    parsed.data.taskId,
    {
      assigned_to: parsed.data.assignedTo,
      due_date: parsed.data.dueDate,
      title: parsed.data.title,
    },
    supabase,
  );

  if ("error" in result) return result;

  revalidatePath("/");
  return result;
}

export async function completeTaskAction(
  input: z.infer<typeof taskIdSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: "Niet ingelogd" };

  const supabase = await createClient();
  const result = await completeTask(parsed.data.taskId, supabase);

  if ("error" in result) return result;

  revalidatePath("/");
  return result;
}

export async function dismissTaskAction(
  input: z.infer<typeof taskIdSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: "Niet ingelogd" };

  const supabase = await createClient();
  const result = await dismissTask(parsed.data.taskId, supabase);

  if ("error" in result) return result;

  revalidatePath("/");
  return result;
}
