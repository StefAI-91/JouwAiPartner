import { z } from "zod";

/**
 * CC-006 — Compose-vorm voor team-initiated free message. Cockpit-zijde.
 * `organization_id` wordt server-side uit het project afgeleid; de client
 * kiest alleen `projectId` + `body`.
 */
export const composeMessageSchema = z.object({
  projectId: z.string().uuid(),
  body: z.string().min(10).max(5000),
});

export type ComposeMessageInput = z.infer<typeof composeMessageSchema>;
