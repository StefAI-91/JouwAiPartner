import { z } from "zod";

export const updateProjectAliasesSchema = z.object({
  projectId: z.string().uuid(),
  aliases: z.array(z.string()),
});
