/**
 * Publieke deur voor het emails-domein. Consumers importeren via
 * `@repo/database/queries/emails` en krijgen alles uit accounts/lists/
 * detail/pipeline.
 *
 * Voor fine-grained imports kan ook direct uit een sub-file:
 * `@repo/database/queries/emails/pipeline` etc.
 */

export {
  listActiveGoogleAccountsSafe,
  listActiveGoogleAccounts,
  getGoogleAccountById,
  getGoogleAccountByEmail,
  type GoogleAccountSafe,
  type GoogleAccountRow,
} from "./accounts";

export {
  listEmails,
  countEmailsByFilterStatus,
  listEmailsByOrganization,
  countEmailsByDirection,
  type EmailDirection,
  type EmailFilterStatus,
  type EmailListItem,
} from "./lists";

export {
  getEmailById,
  listDraftEmails,
  getDraftEmailById,
  type EmailDetail,
  type ReviewEmail,
} from "./detail";

export {
  getExistingGmailIds,
  countUnprocessedEmails,
  getEmailForPipelineInput,
  listEmailsForReclassify,
  getUnprocessedEmails,
  listEmailProjectIds,
  getEmailOrganizationId,
  listVerifiedEmailsForSummary,
  type EmailForPipelineInput,
  type VerifiedEmailForSummary,
} from "./pipeline";
