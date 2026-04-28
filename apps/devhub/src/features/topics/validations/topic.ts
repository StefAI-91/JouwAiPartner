import { z } from "zod";
import {
  createTopicSchema,
  updateTopicSchema,
  topicStatusSchema,
  linkIssueSchema,
} from "@repo/database/validations/topics";

/**
 * Re-export van de centrale Zod-schemas zodat consumers in `features/topics/`
 * één import-pad hebben. Aangevuld met DevHub-specifieke wrappers waar de
 * Server Action een `id` of identificatie-payload nodig heeft.
 */
export { createTopicSchema, updateTopicSchema, topicStatusSchema, linkIssueSchema };

/**
 * `updateTopic` Server Action wraps `updateTopicSchema` met een `id` veld
 * — handig voor consumenten die het hele payload-object aan de action geven.
 */
export const updateTopicWithIdSchema = updateTopicSchema.and(z.object({ id: z.string().uuid() }));
export type UpdateTopicWithIdInput = z.infer<typeof updateTopicWithIdSchema>;

/**
 * `updateTopicStatus` analoog: status + opts + id.
 */
export const updateTopicStatusActionSchema = topicStatusSchema.and(
  z.object({ id: z.string().uuid() }),
);
export type UpdateTopicStatusActionInput = z.infer<typeof updateTopicStatusActionSchema>;

export const deleteTopicSchema = z.object({ id: z.string().uuid() });
export type DeleteTopicInput = z.infer<typeof deleteTopicSchema>;
