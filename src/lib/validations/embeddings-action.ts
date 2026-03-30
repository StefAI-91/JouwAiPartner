import { z } from "zod";

export const updateRowEmbeddingSchema = z.object({
  table: z.enum(["meetings", "extractions", "people", "projects", "organizations", "decisions"]),
  id: z.string().uuid(),
  embedding: z.array(z.number()).length(1024),
});
