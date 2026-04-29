/**
 * Publieke deur voor topics-mutations. Via `export *` zijn alle helpers
 * bereikbaar op `@repo/database/mutations/topics`. Fine-grained imports
 * blijven mogelijk via bv. `mutations/topics/linking`.
 */

export {
  insertTopic,
  updateTopic,
  deleteTopic,
  type InsertTopicData,
  type UpdateTopicData,
  type MutationResult,
} from "./crud";

export { updateTopicStatus, type UpdateTopicStatusOpts } from "./status";

export {
  linkIssueToTopic,
  setTopicForIssue,
  unlinkIssueFromTopic,
  type LinkIssueResult,
  type LinkVia,
} from "./linking";
