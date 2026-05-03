/**
 * `@repo/notifications` — transactional email via Resend voor klant-portal events.
 *
 * Architecturale regel: notify-calls leven op de server-action laag (`apps/*`),
 * NOOIT in `@repo/database`-mutations. Dat voorkomt een circulaire dep en houdt
 * mutations zuiver. Zie sprint CC-002 §6 voor toelichting.
 */

export { sendMail } from "./send";
export type { SendMailInput, SendMailResult } from "./send";
export { notifyFeedbackStatusChanged } from "./notify/feedback-status";
export { notifyTeamReply } from "./notify/question-reply";
export { notifyNewTeamMessage } from "./notify/new-team-message";
export { pickTemplateForStatus } from "./templates";
export type {
  IssueForTemplate,
  FeedbackTemplateProps,
  QuestionReplyTemplateProps,
  RenderedMail,
} from "./templates/types";
