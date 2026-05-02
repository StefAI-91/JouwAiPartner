import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientQuestionRow } from "@repo/database/mutations/client-questions";
import { listPortalProjectAssignees } from "@repo/database/queries/portal";
import { sendMail } from "../send";
import { newTeamReplyTemplate } from "../templates";

/**
 * Notificeert klant-portal-leden over een nieuw team-antwoord op een vraag.
 *
 * Alleen aan te roepen voor `role: "team"` replies — een klant-reply triggert
 * geen mail (team krijgt in-app counter, vision §8).
 *
 * Best-effort: faalt nooit de caller. Skip-conditions:
 *   - Geen klant-recipients gekoppeld aan het project.
 */
export async function notifyTeamReply(
  parentQuestion: Pick<ClientQuestionRow, "id" | "project_id" | "body">,
  replyBody: string,
  client?: SupabaseClient,
): Promise<void> {
  try {
    const assignees = await listPortalProjectAssignees(parentQuestion.project_id, client);
    const clientRecipients = assignees.filter((a) => a.role === "client" && a.email);
    if (clientRecipients.length === 0) return;

    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "";
    const rendered = newTeamReplyTemplate({
      question: parentQuestion,
      replyPreview: replyBody.slice(0, 200),
      portalUrl,
    });

    await Promise.all(
      clientRecipients.map((r) =>
        sendMail({
          to: r.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tag: "new-team-reply",
        }),
      ),
    );
  } catch (err) {
    console.error("[notifyTeamReply] failed", {
      questionId: parentQuestion.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
