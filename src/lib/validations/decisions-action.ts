import { z } from "zod";

export const insertDecisionSchema = z.object({
  decision: z.string(),
  context: z.string().nullable(),
  made_by: z.string(),
  source_type: z.string(),
  source_id: z.string().uuid(),
  project_id: z.string().uuid().nullable(),
  date: z.string(),
  status: z.string(),
  embedding_stale: z.boolean(),
});
