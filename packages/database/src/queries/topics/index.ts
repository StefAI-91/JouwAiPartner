/**
 * Publieke deur voor het topics-domein. Consumers importeren via
 * `@repo/database/queries/topics` en krijgen alles uit list/detail/
 * linked-issues. Voor fine-grained imports kan ook direct uit een
 * sub-file: `@repo/database/queries/topics/list` etc.
 */

export {
  TOPIC_LIST_COLS,
  listTopics,
  listTopicsByBucket,
  type ListTopicsFilters,
  type TopicListRow,
} from "./list";

export {
  getTopicById,
  getTopicWithIssues,
  type LinkedIssueRow,
  type TopicDetailRow,
  type TopicWithIssues,
} from "./detail";

export { countIssuesPerTopic, getIssuesForTopic } from "./linked-issues";
