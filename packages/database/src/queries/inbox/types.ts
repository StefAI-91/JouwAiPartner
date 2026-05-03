import type { IssueRow } from "../issues";

/**
 * Public types & constants voor de inbox-cluster.
 *
 * CC-001 — Cockpit Inbox cross-project queries. Eén DB, twee views (vision §3):
 * cockpit-team ziet alle accessible projecten, portal-klant ziet eigen project.
 * Deze cluster bedient alleen de cockpit-zijde.
 */

export type InboxItemKind = "feedback" | "question";

export type InboxFilter = "alles" | "wacht_op_mij" | "wacht_op_klant" | "geparkeerd";

/** Hard cap op de listquery; UI toont "verfijn filter"-cue als de ceiling geraakt is. */
export const INBOX_LIST_LIMIT = 200;

export interface InboxProjectInfo {
  id: string;
  name: string | null;
}

export interface InboxFeedbackItem {
  kind: "feedback";
  id: string;
  activityAt: string;
  isUnread: boolean;
  issue: IssueRow;
  project: InboxProjectInfo;
}

export interface InboxQuestionReply {
  id: string;
  body: string;
  sender_profile_id: string;
  created_at: string;
}

export interface InboxQuestionThread {
  id: string;
  project_id: string;
  organization_id: string;
  sender_profile_id: string;
  body: string;
  status: "open" | "responded";
  created_at: string;
  last_activity_at: string | null;
  replies: InboxQuestionReply[];
}

export interface InboxQuestionItem {
  kind: "question";
  id: string;
  activityAt: string;
  isUnread: boolean;
  thread: InboxQuestionThread;
  project: InboxProjectInfo;
}

export type InboxItem = InboxFeedbackItem | InboxQuestionItem;

export interface InboxListResult {
  items: InboxItem[];
  /** True als de result is gecapt op INBOX_LIST_LIMIT (200). UI toont "verfijn filter". */
  hasMore: boolean;
}

export interface InboxCounts {
  pmReview: number;
  openQuestions: number;
  deferred: number;
  unread: number;
}

export interface ConversationMessage {
  id: string;
  body: string;
  sender_profile_id: string;
  created_at: string;
  // Sender-profile join voor avatar/name in de bubble.
  sender: { id: string; full_name: string | null } | null;
}

export interface FeedbackConversation {
  kind: "feedback";
  issue: IssueRow;
  // Voor feedback bestaat (nog) geen messages-thread; v1 toont alleen het
  // issue-body als single bubble. Later (CC-004) komen comments/reacties.
  messages: ConversationMessage[];
}

export interface QuestionConversation {
  kind: "question";
  thread: InboxQuestionThread;
  messages: ConversationMessage[];
}

export type ConversationThread = FeedbackConversation | QuestionConversation;
