"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { getCurrentProfile } from "@repo/auth/access";
import { sendQuestion } from "@repo/database/mutations/client-questions";
import { getProjectOrganizationId } from "@repo/database/queries/projects/lookup";
import { markInboxItemRead } from "@repo/database/mutations/inbox-reads";
import { notifyNewTeamMessage } from "@repo/notifications";
import { composeMessageSchema } from "../validations/compose";

/**
 * CC-006 — Cockpit "+ Nieuw bericht": team start een vrije thread naar de
 * klant. Mens-naar-mens; AI-draft (CC-004) blijft gedeferred.
 *
 * Geen draft-tabel of review-gate: dit is een directe send. Identiteit komt
 * uit auth-context, project-organization wordt server-side gelookupt zodat
 * de payload niet kan spoofen op org-niveau.
 */
export type ComposeMessageResult = { success: true; messageId: string } | { error: string };

export async function composeMessageToClientAction(input: unknown): Promise<ComposeMessageResult> {
  const parsed = composeMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { error: "Niet ingelogd" };
  if (profile.role === "client") return { error: "Geen toegang" };

  const organizationId = await getProjectOrganizationId(parsed.data.projectId, supabase);
  if (!organizationId) return { error: "Project niet gevonden" };

  const result = await sendQuestion(
    {
      project_id: parsed.data.projectId,
      organization_id: organizationId,
      body: parsed.data.body,
    },
    profile.id,
    supabase,
  );

  if ("error" in result) return { error: result.error };

  // Eigen compose telt direct als gelezen — voorkomt unread-badge op je
  // eigen verzonden bericht.
  await markInboxItemRead(profile.id, "question", result.data.id, supabase);

  // Best-effort mail naar klant; faalt nooit de action.
  await notifyNewTeamMessage(result.data, supabase).catch((err) =>
    console.error("[composeMessageToClientAction] notify failed", err),
  );

  revalidatePath("/inbox");
  revalidatePath("/", "layout");
  return { success: true, messageId: result.data.id };
}
