import { z } from "zod";
import { TOPIC_LIFECYCLE_STATUSES, TOPIC_TYPES } from "../constants/topics";

const TOPIC_PRIORITIES = ["P0", "P1", "P2", "P3"] as const;

/**
 * Validatie-schema voor het aanmaken van een topic. `created_by` zit
 * bewust niet in dit schema — die haalt de Server Action uit de
 * auth-context en geeft hem rechtstreeks aan `insertTopic` door, zodat
 * een geknoeid form-payload de identiteit niet kan spoofen.
 */
export const createTopicSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(3).max(200),
  client_title: z.string().max(200).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  client_description: z.string().max(5000).nullable().optional(),
  type: z.enum(TOPIC_TYPES),
  priority: z.enum(TOPIC_PRIORITIES).nullable().optional(),
  target_sprint_id: z.string().max(100).nullable().optional(),
});
export type CreateTopicInput = z.infer<typeof createTopicSchema>;

/**
 * Update-schema. Alle velden zijn optioneel maar de payload moet
 * minstens één bekende key bevatten — anders is het een no-op die
 * we niet naar de DB sturen.
 *
 * `project_id` is bewust niet updatebaar (een topic verhuist niet
 * tussen projecten — dat is een nieuw topic). `status`, `closed_at`
 * en `wont_do_reason` lopen via `topicStatusSchema` + `updateTopicStatus`.
 */
export const updateTopicSchema = createTopicSchema
  .omit({ project_id: true })
  .partial()
  .extend({
    status_overridden: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "updateTopic vereist minstens één veld",
  });
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;

/**
 * Status-overgang. `wont_do_reason` is in fase 1 optioneel; PR-009 zet
 * de hard-regel "verplicht en min 10 chars bij wont_do(*)". Hier
 * vragen we het al via een refine zodat de UI nu al kan testen, maar
 * we accepteren het ook leeg in fase 1 (DB-CHECK volgt later).
 */
export const topicStatusSchema = z
  .object({
    status: z.enum(TOPIC_LIFECYCLE_STATUSES),
    wont_do_reason: z.string().min(10).max(500).nullable().optional(),
    status_overridden: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "wont_do" || data.status === "wont_do_proposed_by_client") {
        // Soft warning in fase 1: we accepteren leeg, maar leeg-én-aanwezig is fout.
        if (data.wont_do_reason !== undefined && data.wont_do_reason !== null) {
          return data.wont_do_reason.trim().length === 0
            ? false
            : data.wont_do_reason.trim().length >= 10;
        }
      }
      return true;
    },
    { message: "wont_do_reason moet leeg óf minstens 10 tekens zijn", path: ["wont_do_reason"] },
  );
export type TopicStatusInput = z.infer<typeof topicStatusSchema>;

/**
 * Koppel-schema. Beide kanten zijn UUID's; de DB borgt de UNIQUE-regel
 * (max 1 topic per issue) — wij doen hier alleen vorm-validatie.
 */
export const linkIssueSchema = z.object({
  topic_id: z.string().uuid(),
  issue_id: z.string().uuid(),
});
export type LinkIssueInput = z.infer<typeof linkIssueSchema>;
