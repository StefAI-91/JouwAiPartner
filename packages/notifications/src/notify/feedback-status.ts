import type { SupabaseClient } from "@supabase/supabase-js";
import type { IssueStatus } from "@repo/database/constants/issues";
import { listPortalProjectAssignees } from "@repo/database/queries/portal";
import { sendMail } from "../send";
import { pickTemplateForStatus } from "../templates";
import type { IssueForTemplate } from "../templates/types";
import { requirePortalUrl } from "../client";

/**
 * Notificeert klant-portal-leden over een statuswijziging op een feedback-issue.
 *
 * Wordt op de server-action-laag aangeroepen, NOOIT vanuit `@repo/database`-mutations
 * (zou een circulaire dependency opleveren — zie sprint CC-002 §6).
 *
 * Best-effort: een Resend-failure mag de mutation NIET laten falen. De caller
 * wrapt dit in `try/catch` of `.catch()`, maar wij vangen ook hier zodat een
 * vergeten catch geen incident wordt.
 *
 * Skip-conditions (silent, geen error):
 *   - Geen klant-recipients gekoppeld aan het project (eindgebruiker-widget items).
 *   - Status zonder bijbehorend mail-trigger (bv. `backlog`, `todo`).
 */
export async function notifyFeedbackStatusChanged(
  issue: IssueForTemplate,
  newStatus: IssueStatus,
  client?: SupabaseClient,
): Promise<void> {
  try {
    const picked = pickTemplateForStatus(newStatus);
    if (!picked) return;

    const assignees = await listPortalProjectAssignees(issue.project_id, client);
    const clientRecipients = assignees.filter((a) => a.role === "client" && a.email);
    if (clientRecipients.length === 0) return;

    const portalUrl = requirePortalUrl();
    if (!portalUrl) return;
    const rendered = picked.template({ issue, portalUrl });

    // CC-007 — `allSettled` zodat één failing recipient (bv. bounce, Resend
    // 4xx op één adres) de andere niet kapot maakt. Resend logt zelf de
    // individuele errors; wij loggen het aggregaat.
    const results = await Promise.allSettled(
      clientRecipients.map((r) =>
        sendMail({
          to: r.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tag: picked.tag,
        }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error("[notifyFeedbackStatusChanged] partial failure", {
        issueId: issue.id,
        failedCount: failed.length,
        total: results.length,
      });
    }
  } catch (err) {
    console.error("[notifyFeedbackStatusChanged] failed", {
      issueId: issue.id,
      newStatus,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
