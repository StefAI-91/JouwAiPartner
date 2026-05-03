import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientQuestionRow } from "@repo/database/mutations/client-questions";
import { listPortalProjectAssignees } from "@repo/database/queries/portal";
import { sendMail } from "../send";
import { newTeamMessageTemplate } from "../templates";
import { requirePortalUrl } from "../client";

/**
 * CC-006 — Notificeert klant-portal-leden over een nieuw team-initiated
 * vrij bericht. Mirror van `notifyTeamReply`, maar voor root-messages
 * zonder parent-context.
 *
 * Best-effort: faalt nooit de caller. Skip-conditions:
 *   - Geen klant-recipients gekoppeld aan het project.
 */
export async function notifyNewTeamMessage(
  message: Pick<ClientQuestionRow, "id" | "project_id" | "body">,
  client?: SupabaseClient,
): Promise<void> {
  try {
    const assignees = await listPortalProjectAssignees(message.project_id, client);
    const clientRecipients = assignees.filter((a) => a.role === "client" && a.email);
    if (clientRecipients.length === 0) return;

    const portalUrl = requirePortalUrl();
    if (!portalUrl) return;
    const rendered = newTeamMessageTemplate({ message, portalUrl });

    const results = await Promise.allSettled(
      clientRecipients.map((r) =>
        sendMail({
          to: r.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tag: "new-team-message",
        }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error("[notifyNewTeamMessage] partial failure", {
        messageId: message.id,
        failedCount: failed.length,
        total: results.length,
      });
    }
  } catch (err) {
    console.error("[notifyNewTeamMessage] failed", {
      messageId: message.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
