import type { IssueStatus } from "@repo/database/constants/issues";
import type { FeedbackTemplate } from "./types";
import { feedbackEndorsedTemplate } from "./feedback-endorsed";
import { feedbackDeclinedTemplate } from "./feedback-declined";
import { feedbackDeferredTemplate } from "./feedback-deferred";
import { feedbackConvertedTemplate } from "./feedback-converted";
import { feedbackProgressTemplate } from "./feedback-progress";
import { feedbackDoneTemplate } from "./feedback-done";

export {
  feedbackEndorsedTemplate,
  feedbackDeclinedTemplate,
  feedbackDeferredTemplate,
  feedbackConvertedTemplate,
  feedbackProgressTemplate,
  feedbackDoneTemplate,
};
export { newTeamReplyTemplate } from "./new-team-reply";
export { newTeamMessageTemplate } from "./new-team-message";
export type { NewTeamMessageTemplateProps } from "./new-team-message";
export { portalAccessGrantedTemplate } from "./portal-access-granted";
export type { PortalAccessGrantedTemplateProps } from "./portal-access-granted";
export * from "./types";

/**
 * Mapping van een nieuwe `IssueStatus` naar de bijbehorende mail-template.
 * Statussen die géén klant-mail triggeren (`needs_pm_review`, `backlog`,
 * `todo`, `cancelled`) vallen op `null`.
 *
 * Tags voor Resend-dashboard-filtering matchen op de status (bv. `feedback-triage`).
 */
export function pickTemplateForStatus(
  status: IssueStatus,
): { template: FeedbackTemplate; tag: string } | null {
  switch (status) {
    case "triage":
      return { template: feedbackEndorsedTemplate, tag: "feedback-triage" };
    case "declined":
      return { template: feedbackDeclinedTemplate, tag: "feedback-declined" };
    case "deferred":
      return { template: feedbackDeferredTemplate, tag: "feedback-deferred" };
    case "converted_to_qa":
      return { template: feedbackConvertedTemplate, tag: "feedback-converted_to_qa" };
    case "in_progress":
      return { template: feedbackProgressTemplate, tag: "feedback-in_progress" };
    case "done":
      return { template: feedbackDoneTemplate, tag: "feedback-done" };
    case "needs_pm_review":
    case "backlog":
    case "todo":
    case "cancelled":
      return null;
    default: {
      // CC-008 — exhaustive guard. Een nieuwe `IssueStatus` zonder
      // case-clause faalt hier compile-time (`never` type-narrow).
      const _exhaustive: never = status;
      void _exhaustive;
      return null;
    }
  }
}
