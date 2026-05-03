import type { IssueRow } from "@repo/database/queries/issues";
import type { ClientQuestionRow } from "@repo/database/mutations/client-questions";

/**
 * Subset van `IssueRow` die alle feedback-templates nodig hebben.
 * Houdt template-signatures klein én zorgt dat de notify-orchestrator
 * alleen die kolommen hoeft te selecteren.
 */
export type IssueForTemplate = Pick<
  IssueRow,
  "id" | "project_id" | "title" | "client_title" | "status" | "decline_reason"
>;

export interface FeedbackTemplateProps {
  issue: IssueForTemplate;
  /** Basis-URL portaal (zonder trailing slash). */
  portalUrl: string;
}

export interface QuestionReplyTemplateProps {
  question: Pick<ClientQuestionRow, "id" | "project_id" | "body">;
  replyPreview: string;
  portalUrl: string;
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

export type FeedbackTemplate = (props: FeedbackTemplateProps) => RenderedMail;
export type QuestionReplyTemplate = (props: QuestionReplyTemplateProps) => RenderedMail;

/** Geeft een leesbare titel: client_title als die er is, anders de interne titel. */
export function pickIssueTitle(issue: IssueForTemplate): string {
  return issue.client_title?.trim() || issue.title;
}

/** Bouwt deeplink naar een feedback-item in het portaal. */
export function feedbackDeeplink(portalUrl: string, issue: IssueForTemplate): string {
  const base = portalUrl.replace(/\/+$/, "");
  return `${base}/projects/${issue.project_id}/feedback/${issue.id}`;
}

/** Bouwt deeplink naar de inbox van een project. */
export function inboxDeeplink(portalUrl: string, projectId: string): string {
  const base = portalUrl.replace(/\/+$/, "");
  return `${base}/projects/${projectId}/inbox`;
}

/** Bouwt deeplink naar de project-overzichtspagina in het portaal. */
export function projectDeeplink(portalUrl: string, projectId: string): string {
  const base = portalUrl.replace(/\/+$/, "");
  return `${base}/projects/${projectId}`;
}
