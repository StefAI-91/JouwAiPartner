import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import { ISSUE_SELECT, type IssueRow } from "../../queries/issues";

/**
 * CC-001 — PM-review-gate mutations.
 *
 * Vier acties die een PM kan doen op een `needs_pm_review`-issue:
 *   - endorse:  → triage (klaar voor DevHub-pickup)
 *   - decline:  → declined + decline_reason (klant ziet eind-verklaring)
 *   - defer:    → deferred (parked, kan terug)
 *   - convert:  → converted_to_qa + spawned client_questions-rij
 *
 * Alle vier accepteren `actorId` zodat een latere `audit_events`-insert
 * zonder signature-break kan worden toegevoegd (vision §10 decision #4).
 *
 * Optimistic concurrency via status-guard `where status = 'needs_pm_review'`:
 * twee PM's die tegelijk handelen → één wint, ander ziet `affected_rows = 0`.
 */

export type PmReviewMutationResult = { success: true; data: IssueRow } | { error: string };

interface IssueProjectLookup {
  project_id: string;
  organization_id: string | null;
}

const NOW = () => new Date().toISOString();

/**
 * Endorse — flip needs_pm_review → triage.
 *
 * Status-guard zorgt dat dubbel-endorseren idempotent blijft (geen state-flip,
 * geen error). UI toont "andere reviewer was sneller" als affected = 0.
 */
export async function endorseIssue(
  id: string,
  _actorId: string,
  client?: SupabaseClient,
): Promise<PmReviewMutationResult> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issues")
    .update({ status: "triage", updated_at: NOW() })
    .eq("id", id)
    .eq("status", "needs_pm_review")
    .select(ISSUE_SELECT)
    .maybeSingle();

  if (error) return { error: `endorseIssue failed: ${error.message}` };
  if (!data) return { error: "Issue niet gevonden of al verwerkt" };
  return { success: true, data: data as unknown as IssueRow };
}

export async function declineIssue(
  id: string,
  _actorId: string,
  declineReason: string,
  client?: SupabaseClient,
): Promise<PmReviewMutationResult> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issues")
    .update({
      status: "declined",
      decline_reason: declineReason,
      closed_at: NOW(),
      updated_at: NOW(),
    })
    .eq("id", id)
    .eq("status", "needs_pm_review")
    .select(ISSUE_SELECT)
    .maybeSingle();

  if (error) return { error: `declineIssue failed: ${error.message}` };
  if (!data) return { error: "Issue niet gevonden of al verwerkt" };
  return { success: true, data: data as unknown as IssueRow };
}

export async function deferIssue(
  id: string,
  _actorId: string,
  client?: SupabaseClient,
): Promise<PmReviewMutationResult> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issues")
    .update({ status: "deferred", updated_at: NOW() })
    .eq("id", id)
    .eq("status", "needs_pm_review")
    .select(ISSUE_SELECT)
    .maybeSingle();

  if (error) return { error: `deferIssue failed: ${error.message}` };
  if (!data) return { error: "Issue niet gevonden of al verwerkt" };
  return { success: true, data: data as unknown as IssueRow };
}

/**
 * Convert — issue wordt omgezet naar een klant-vraag.
 *
 * Issue-eerst om orphan-questions te voorkomen. Bij step-3-fail staat de
 * issue al op converted_to_qa zonder bijbehorende vraag (PM ziet "kapot"
 * in cockpit, kan handmatig herstellen). Vraag-eerst zou bij step-2-fail
 * een orphan client_questions-rij achterlaten die de klant wél ziet.
 * Issue-eerst maakt fail-state intern-zichtbaar i.p.v. klant-zichtbaar.
 *
 * Step 4 (FK-link bijwerken) mag ook falen — dan ontbreekt enkel de FK,
 * niet de data; opruim kan post-hoc via client_questions.issue_id.
 */
export async function convertIssueToQuestion(
  id: string,
  actorId: string,
  questionBody: string,
  client?: SupabaseClient,
): Promise<PmReviewMutationResult> {
  const db = client ?? getAdminClient();

  // Step 1: issue ophalen voor project_id / organization_id.
  const { data: lookup, error: lookupError } = await db
    .from("issues")
    .select("project_id, projects!inner(organization_id), status")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) return { error: `convertIssueToQuestion lookup failed: ${lookupError.message}` };
  if (!lookup) return { error: "Issue niet gevonden" };
  if ((lookup as { status?: string }).status !== "needs_pm_review") {
    return { error: "Issue niet meer in needs_pm_review" };
  }

  const projectInfo = lookup as unknown as IssueProjectLookup & {
    projects: { organization_id: string };
  };
  const organizationId = projectInfo.projects?.organization_id;
  if (!organizationId) return { error: "Project zonder organization_id" };

  // Step 2: issue flippen naar converted_to_qa met status-guard.
  const { data: flipped, error: flipError } = await db
    .from("issues")
    .update({
      status: "converted_to_qa",
      closed_at: NOW(),
      updated_at: NOW(),
    })
    .eq("id", id)
    .eq("status", "needs_pm_review")
    .select(ISSUE_SELECT)
    .maybeSingle();

  if (flipError) return { error: `convertIssueToQuestion flip failed: ${flipError.message}` };
  if (!flipped) return { error: "Issue niet gevonden of al verwerkt" };

  // Step 3: spawned client_questions-rij. Als dit faalt: issue blijft op
  // converted_to_qa zonder FK — intern zichtbaar voor PM-handmatig-herstel.
  const { data: question, error: questionError } = await db
    .from("client_questions")
    .insert({
      project_id: projectInfo.project_id,
      organization_id: organizationId,
      sender_profile_id: actorId,
      issue_id: id,
      body: questionBody,
      status: "open",
    })
    .select("id")
    .single();

  if (questionError) {
    // Bewust geen rollback van de issue — vision §10 prefereert intern-
    // zichtbare fail boven klant-zichtbare orphan vraag.
    return { error: `convertIssueToQuestion question-insert failed: ${questionError.message}` };
  }

  // Step 4: FK-link op de issue zetten. Best-effort; bij fail is alleen
  // de cross-link weg, data-integriteit blijft (client_questions.issue_id
  // wijst nog naar deze issue).
  const { data: linked } = await db
    .from("issues")
    .update({
      converted_to_question_id: question.id,
      updated_at: NOW(),
    })
    .eq("id", id)
    .select(ISSUE_SELECT)
    .maybeSingle();

  return { success: true, data: (linked ?? flipped) as unknown as IssueRow };
}
