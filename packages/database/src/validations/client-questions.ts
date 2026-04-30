import { z } from "zod";

/**
 * PR-022 — Validatie voor klant-vragen (`client_questions`).
 *
 * `sender_profile_id` zit bewust niet in deze schemas: die haalt de Server
 * Action uit de auth-context en geeft hem rechtstreeks aan de mutation door,
 * zodat een geknoeid form-payload de identiteit niet kan spoofen (zelfde
 * patroon als `validations/topics.ts` gebruikt voor `created_by`).
 */

/**
 * Root-vraag (team → klant). `topic_id` en `issue_id` zijn optionele
 * context-koppelingen; de `chk_question_xor_link`-constraint op DB-niveau
 * blokkeert beide tegelijk, en deze refine geeft eerder een leesbare error.
 *
 * `due_date` is bewust een vrije timestamp zonder reminder-systeem in v1
 * (zie sprint-spec §Risico's).
 */
export const sendQuestionSchema = z
  .object({
    project_id: z.string().uuid(),
    organization_id: z.string().uuid(),
    body: z.string().min(10).max(2000),
    topic_id: z.string().uuid().nullable().optional(),
    issue_id: z.string().uuid().nullable().optional(),
    due_date: z.string().datetime().nullable().optional(),
  })
  .refine((data) => !(data.topic_id && data.issue_id), {
    message: "Een vraag kan aan een topic óf een issue gekoppeld zijn, niet beide",
    path: ["issue_id"],
  });
export type SendQuestionInput = z.infer<typeof sendQuestionSchema>;

/**
 * Reply op een bestaande vraag. `project_id` + `organization_id` worden in
 * de mutation uit parent afgeleid (zie `replyToQuestion`), zodat een client
 * geen reply op een andere-org-thread kan smokkelen door eigen IDs mee te
 * sturen.
 */
export const replyToQuestionSchema = z.object({
  parent_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
});
export type ReplyToQuestionInput = z.infer<typeof replyToQuestionSchema>;
