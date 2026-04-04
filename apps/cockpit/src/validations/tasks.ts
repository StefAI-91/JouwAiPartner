import { z } from "zod";

export const optionalStringOrNull = z.string().nullable().optional();
export const optionalDateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldig datumformaat (YYYY-MM-DD)")
  .nullable()
  .optional();

export const promoteToTaskSchema = z.object({
  extractionId: z.string().uuid(),
  title: z.string().min(1),
  assignedTo: optionalStringOrNull,
  dueDate: optionalDateOrNull,
  alreadyDone: z.boolean().optional(),
});

export const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  assignedTo: optionalStringOrNull,
  dueDate: optionalDateOrNull,
  title: z.string().min(1).optional(),
});

export const taskIdSchema = z.object({
  taskId: z.string().uuid(),
});
