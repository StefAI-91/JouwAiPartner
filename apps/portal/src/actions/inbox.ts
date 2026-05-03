"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { getCurrentProfile } from "@repo/auth/access";
import { hasPortalProjectAccess } from "@repo/database/queries/portal/access";
import { replyToQuestion, sendQuestion } from "@repo/database/mutations/client-questions";
import { replyToQuestionSchema } from "@repo/database/validations/client-questions";
import { getProjectOrganizationId } from "@repo/database/queries/projects/lookup";

/**
 * PR-023 — Portal-action voor de klant-reply.
 *
 * Validatie loopt in drie lagen, conform CLAUDE.md § Security:
 *
 *   1. Zod-schema (`replyToQuestionSchema`) — vorm van de payload.
 *   2. Auth + portal-access op `projectId` — wie mag deze parent zien?
 *   3. RLS in `client_questions` (PR-022) — DB-niveau backstop.
 *
 * `projectId` komt mee als argument (uit de page-context), niet uit het
 * form-payload. Zo kunnen we de access-check doen vóór we überhaupt naar
 * de DB schrijven, en blijft de keten 1:1 met de portal-routestructuur
 * waarvoor we revalideren.
 */
export type ReplyAsClientResult = { success: true } | { error: string };

export async function replyAsClientAction(
  projectId: string,
  input: unknown,
): Promise<ReplyAsClientResult> {
  const parsed = replyToQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { error: "Niet ingelogd" };

  const allowed = await hasPortalProjectAccess(profile.id, projectId, supabase);
  if (!allowed) return { error: "Geen toegang tot dit project" };

  // Klant-rol → mutation flipt parent.status naar `responded` bij eerste reply.
  // Voor niet-clients (member/admin met portal-access) zou je 'team' willen
  // sturen, maar de portal is in v1 puur klant-facing — `member` ziet wat de
  // klant ziet voor preview-doeleinden, een reply via portal-form behoort dus
  // tot het klant-gespreksspoor en is daarom altijd `client`.
  const result = await replyToQuestion(
    parsed.data,
    { profile_id: profile.id, role: "client" },
    supabase,
  );

  if ("error" in result) return { error: result.error };

  revalidatePath(`/projects/${projectId}/inbox`);
  // Sidebar-counter staat in de root-layout; revalideer ook die.
  revalidatePath(`/projects/${projectId}`, "layout");
  return { success: true };
}

/**
 * CC-006 — Klant start een vrij bericht naar het team. Werkt parallel aan
 * `replyAsClientAction` maar zonder parent: dit is een nieuwe thread.
 *
 * RLS uit migratie 20260503100000 staat de root-INSERT toe voor klanten met
 * portal-access op het project + matching organization. We doen de
 * portal-access-check expliciet in de action (defense-in-depth) zodat we
 * een verstaanbare error terugkrijgen i.p.v. een stille RLS-rejection.
 *
 * Geen mail naar team (vision §8 in-app only); sidebar-counter update via
 * revalidatePath in de cockpit-layout zodra de PM de inbox opent.
 */
const sendMessageAsClientSchema = z.object({
  body: z.string().min(10).max(5000),
});

export type SendMessageAsClientResult = { success: true; messageId: string } | { error: string };

export async function sendMessageAsClientAction(
  projectId: string,
  input: unknown,
): Promise<SendMessageAsClientResult> {
  const parsed = sendMessageAsClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { error: "Niet ingelogd" };

  const allowed = await hasPortalProjectAccess(profile.id, projectId, supabase);
  if (!allowed) return { error: "Geen toegang tot dit project" };

  const organizationId = await getProjectOrganizationId(projectId, supabase);
  if (!organizationId) return { error: "Project niet gevonden" };

  const result = await sendQuestion(
    {
      project_id: projectId,
      organization_id: organizationId,
      body: parsed.data.body,
    },
    profile.id,
    supabase,
  );

  if ("error" in result) return { error: result.error };

  revalidatePath(`/projects/${projectId}/inbox`);
  revalidatePath(`/projects/${projectId}`, "layout");
  return { success: true, messageId: result.data.id };
}
