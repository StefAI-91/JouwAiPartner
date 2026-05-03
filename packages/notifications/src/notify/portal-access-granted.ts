import type { SupabaseClient } from "@supabase/supabase-js";
import { getProjectName } from "@repo/database/queries/projects";
import { sendMail } from "../send";
import { portalAccessGrantedTemplate } from "../templates";
import { requirePortalUrl } from "../client";

export interface NotifyPortalAccessGrantedInput {
  /** E-mailadres van de gebruiker die zojuist toegang heeft gekregen. */
  to: string;
  projectId: string;
}

/**
 * Notificeert een gebruiker met een bestaand account dat ze portal-toegang
 * hebben gekregen tot een specifiek project. Wordt aangeroepen vanuit
 * `inviteProjectClientAction` (existing-user-pad) en
 * `grantMemberPortalAccessAction` — twee paden waarin Supabase Auth zelf
 * géén invite-mail stuurt omdat de user al een account heeft.
 *
 * Best-effort: faalt nooit de caller. Skip-conditions:
 *   - Geen `NEXT_PUBLIC_PORTAL_URL` (dode CTA voorkomen).
 *   - Geen `to`-email (caller-bug; we loggen).
 */
export async function notifyPortalAccessGranted(
  input: NotifyPortalAccessGrantedInput,
  client?: SupabaseClient,
): Promise<void> {
  try {
    if (!input.to) {
      console.error("[notifyPortalAccessGranted] missing recipient", {
        projectId: input.projectId,
      });
      return;
    }

    const portalUrl = requirePortalUrl();
    if (!portalUrl) return;

    const projectName = await getProjectName(input.projectId, client);
    const rendered = portalAccessGrantedTemplate({
      projectId: input.projectId,
      projectName,
      portalUrl,
    });

    await sendMail({
      to: input.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: "portal-access-granted",
    });
  } catch (err) {
    console.error("[notifyPortalAccessGranted] failed", {
      projectId: input.projectId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
