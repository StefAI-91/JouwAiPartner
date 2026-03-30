import { z } from "zod";

export const insertActionItemSchema = z.object({
  description: z.string(),
  assignee: z.string().nullable(),
  due_date: z.string().nullable(),
  scope: z.string(),
  status: z.string(),
  source_type: z.string(),
  source_id: z.string().uuid(),
  project_id: z.string().uuid().nullable(),
});
