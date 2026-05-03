import { z } from "zod";
import { messageBodySchema } from "@repo/database/validations/client-questions";

/**
 * CC-006 — Compose-vorm voor team-initiated free message. Cockpit-zijde.
 * `organization_id` wordt server-side uit het project afgeleid; de client
 * kiest alleen `projectId` + `body`.
 *
 * `body` deelt sinds CC-008 dezelfde regel als `sendQuestionSchema` via
 * `messageBodySchema` — één bron-van-waarheid voor de min/max-grens.
 */
export const composeMessageSchema = z.object({
  projectId: z.string().uuid(),
  body: messageBodySchema,
});

export type ComposeMessageInput = z.infer<typeof composeMessageSchema>;
