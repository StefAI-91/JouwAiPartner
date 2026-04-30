import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import { sendQuestionSchema, replyToQuestionSchema } from "../validations/client-questions";

/**
 * PR-022 — Mutations voor `client_questions`.
 *
 * Twee mutations: `sendQuestion` (root, team-only via RLS) en
 * `replyToQuestion` (reply, team óf klant). Identiteit (`sender_profile_id`)
 * komt nooit uit de payload; de Server Action geeft hem expliciet door zodat
 * een geknoeid form-payload de afzender niet kan spoofen.
 */

export type MutationResult<T> =
  | { success: true; data: T }
  | { error: string; fieldErrors?: Record<string, string[]> };

export interface ClientQuestionRow {
  id: string;
  project_id: string;
  organization_id: string;
  sender_profile_id: string;
  parent_id: string | null;
  topic_id: string | null;
  issue_id: string | null;
  body: string;
  due_date: string | null;
  status: "open" | "responded";
  created_at: string;
  responded_at: string | null;
}

const QUESTION_COLS =
  "id, project_id, organization_id, sender_profile_id, parent_id, topic_id, issue_id, body, due_date, status, created_at, responded_at" as const;

/**
 * `sendQuestion` — root-vraag van team naar klant. RLS blokkeert klant-rol
 * voor root-INSERTs (zie migratie PR-SEC-031), dus deze mutation hoeft op
 * applicatieniveau alleen het schema te valideren.
 */
export async function sendQuestion(
  input: unknown,
  senderProfileId: string,
  client?: SupabaseClient,
): Promise<MutationResult<ClientQuestionRow>> {
  const parsed = sendQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Invalid sendQuestion payload",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("client_questions")
    .insert({
      ...parsed.data,
      sender_profile_id: senderProfileId,
      status: "open",
    })
    .select(QUESTION_COLS)
    .single();

  if (error) return { error: `sendQuestion failed: ${error.message}` };
  return { success: true, data: data as unknown as ClientQuestionRow };
}

/**
 * `replyToQuestion` — reply op een bestaande vraag. Werkt voor team én klant
 * (RLS doet de toegangscontrole op de parent).
 *
 * Twee dingen die deze mutation extra doet bovenop een naïeve INSERT:
 *
 * 1. **Parent uitlezen** voor `project_id` + `organization_id`. Spec laat
 *    open of de caller die meegeeft (variant a) of de mutation parent leest
 *    (variant b). We kiezen (b) — caller hoeft minder te weten en het
 *    voorkomt dat een client via een geknoeide payload een reply onder een
 *    andere org plaatst. Dat is één extra DB-call die we sowieso al nodig
 *    hadden voor de status-flip hieronder.
 *
 * 2. **Status-flip**: bij de eerste reply van een klant op een open vraag
 *    zetten we parent.status naar `responded` + `responded_at = now()`.
 *    Conditioneel op `sender.role === 'client'` zodat een team-reply de
 *    open-status laat staan (team kan blijven verduidelijken). De WHERE
 *    `eq('status', 'open')` zorgt dat een tweede klant-reply de
 *    responded_at niet overschrijft.
 *
 *    Belangrijk: de status-flip draait via een service-role-client, NIET
 *    via de meegegeven `client`. RLS-policy "Client questions: update
 *    (admin/member only)" blokkeert klanten op UPDATE, dus onder een
 *    cookie-authed klant-client zou de UPDATE silent op 0 rows vallen
 *    (`updateError === null`, geen log) en de vraag eeuwig op `open`
 *    blijven staan. Status-overgangen zijn server-managed lifecycle —
 *    niet iets dat onder klant-RLS hoort. Zie ook het comment in de
 *    migratie 20260430110000_client_questions.sql §PR-SEC-032.
 *
 * De drie DB-operations (SELECT parent → INSERT reply → UPDATE parent)
 * draaien zonder transactiewrapper. De impact bij gedeeltelijk falen is
 * begrensd: een geslaagde insert + gefaalde status-flip levert hooguit een
 * "open"-vraag met een klant-reply op — corrigeerbaar via een latere
 * mutation, geen data-corruptie.
 */
export async function replyToQuestion(
  input: unknown,
  sender: { profile_id: string; role: "team" | "client" },
  client?: SupabaseClient,
): Promise<MutationResult<ClientQuestionRow>> {
  const parsed = replyToQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Invalid replyToQuestion payload",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const db = client ?? getAdminClient();

  const { data: parent, error: parentError } = await db
    .from("client_questions")
    .select("id, project_id, organization_id, parent_id, status")
    .eq("id", parsed.data.parent_id)
    .maybeSingle();

  if (parentError) {
    return { error: `replyToQuestion: parent lookup failed: ${parentError.message}` };
  }
  if (!parent) {
    return { error: "replyToQuestion: parent question not found" };
  }
  if (parent.parent_id !== null) {
    // Voorkom replies op replies — threading is platgeslagen op één niveau.
    // Niet hard afgedwongen op DB-niveau (zou een extra CHECK met self-FK-
    // lookup vragen); deze mutation is de gatekeeper.
    return { error: "replyToQuestion: cannot reply to a reply (threading is single-level)" };
  }

  const { data: reply, error: insertError } = await db
    .from("client_questions")
    .insert({
      parent_id: parent.id,
      project_id: parent.project_id,
      organization_id: parent.organization_id,
      sender_profile_id: sender.profile_id,
      body: parsed.data.body,
    })
    .select(QUESTION_COLS)
    .single();

  if (insertError) return { error: `replyToQuestion: insert failed: ${insertError.message}` };

  if (sender.role === "client") {
    // Service-role bewust: zie doc-blok hierboven. RLS-UPDATE-policy laat
    // klanten niet UPDATEn, dus zonder admin-client zou een cookie-authed
    // klant-reply silent op 0 rows vallen en de vraag eeuwig op `open`
    // houden — wat het hele responded-mechanisme breekt.
    const adminDb = getAdminClient();
    const { error: updateError } = await adminDb
      .from("client_questions")
      .update({ status: "responded", responded_at: new Date().toISOString() })
      .eq("id", parent.id)
      .eq("status", "open");
    if (updateError) {
      // Echt falen (DB down, constraint-violation): reply staat in DB, parent
      // hangt op `open`. Loggen en doorlopen — admin kan handmatig flippen,
      // geen data-corruptie.
      console.error("[replyToQuestion] parent status-flip failed:", updateError.message);
    }
  }

  return { success: true, data: reply as unknown as ClientQuestionRow };
}
