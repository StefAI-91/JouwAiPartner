import type { SupabaseClient } from "@supabase/supabase-js";
import { listAccessibleProjectIds } from "@repo/auth/access";
import { getAdminClient } from "../../supabase/admin";
import { ISSUE_SELECT, type IssueRow } from "../issues";
import {
  INBOX_LIST_LIMIT,
  type InboxFilter,
  type InboxFeedbackItem,
  type InboxItem,
  type InboxListResult,
  type InboxProjectInfo,
  type InboxQuestionItem,
  type InboxQuestionThread,
} from "./types";
import {
  QUESTION_LIST_COLS,
  QUESTION_REPLY_EMBED,
  type ReadRow,
  fetchReadMap,
  hasUnreadClientActivity,
  sortWeight,
} from "./helpers";

// Per-filter status-sets — `null` betekent: skip die kant van de query helemaal.
// Sluit aan op `applyFilter` van vóór CC-008 (zelfde gedrag, één bron-van-waarheid).
// Geëxporteerd voor unit-test in `__tests__/queries/inbox-filter-map.test.ts`.
export const ISSUE_STATUSES_PER_FILTER: Record<InboxFilter, string[] | null> = {
  alles: ["needs_pm_review", "deferred"],
  wacht_op_mij: ["needs_pm_review"],
  wacht_op_klant: null, // alleen `responded` questions
  geparkeerd: ["deferred"],
};

export const QUESTION_STATUSES_PER_FILTER: Record<InboxFilter, string[] | null> = {
  alles: ["open", "responded"],
  wacht_op_mij: ["open"],
  wacht_op_klant: ["responded"],
  geparkeerd: null,
};

/**
 * Cross-project inbox-lijst voor team-members. Combineert:
 *   - issues met PM-aandacht-statussen (needs_pm_review, deferred)
 *   - client_questions root-rijen (open of responded)
 *
 * `isUnread` is per-user: true als geen read-row bestaat OF als read_at
 * vóór de activityAt ligt (nieuwe activiteit sinds laatste lees).
 *
 * Optionele `projectId` (CC-005) scopet de query naar één project — gebruikt
 * door de per-project inbox-tab in cockpit. Als de user geen toegang heeft
 * tot dat project (niet in `listAccessibleProjectIds`), retourneert de helper
 * `[]` — geen existence-hint.
 *
 * `filter` (CC-008) wordt naar de DB gepushed via status-sets — voorheen
 * filterde de page in JS na ophalen. Resulteert in 0–2 sub-queries i.p.v. 2.
 *
 * Result is gecapt op `INBOX_LIST_LIMIT` (200) per side; `hasMore` is true
 * als óf issues óf questions de cap raakte. UI gebruikt het als verfijn-cue.
 */
export async function listInboxItemsForTeam(
  profileId: string,
  options: { projectId?: string; filter?: InboxFilter } = {},
  client?: SupabaseClient,
): Promise<InboxListResult> {
  const db = client ?? getAdminClient();
  const filter: InboxFilter = options.filter ?? "alles";
  const accessibleIds = await listAccessibleProjectIds(profileId, db);
  if (accessibleIds.length === 0) return { items: [], hasMore: false };

  const projectIds = options.projectId
    ? accessibleIds.includes(options.projectId)
      ? [options.projectId]
      : []
    : accessibleIds;
  if (projectIds.length === 0) return { items: [], hasMore: false };

  const issueStatuses = ISSUE_STATUSES_PER_FILTER[filter];
  const questionStatuses = QUESTION_STATUSES_PER_FILTER[filter];

  // Skip de side die voor deze filter geen items kan opleveren.
  const issuePromise = issueStatuses
    ? db
        .from("issues")
        .select(`${ISSUE_SELECT}, project:projects(id, name)`)
        .in("project_id", projectIds)
        .in("status", issueStatuses)
        .order("created_at", { ascending: false })
        .limit(INBOX_LIST_LIMIT)
    : Promise.resolve({ data: [], error: null });

  const questionPromise = questionStatuses
    ? db
        .from("client_questions")
        .select(`${QUESTION_LIST_COLS}, ${QUESTION_REPLY_EMBED}, project:projects(id, name)`)
        .in("project_id", projectIds)
        .is("parent_id", null)
        .in("status", questionStatuses)
        .order("last_activity_at", { ascending: false })
        .limit(INBOX_LIST_LIMIT)
    : Promise.resolve({ data: [], error: null });

  const [issuesRes, questionsRes, readsRes] = await Promise.all([
    issuePromise,
    questionPromise,
    db.from("inbox_reads").select("item_kind, item_id, read_at").eq("profile_id", profileId),
  ]);

  if (issuesRes.error) {
    throw new Error(`listInboxItemsForTeam (issues) failed: ${issuesRes.error.message}`);
  }
  if (questionsRes.error) {
    throw new Error(`listInboxItemsForTeam (questions) failed: ${questionsRes.error.message}`);
  }
  if (readsRes.error) {
    throw new Error(`listInboxItemsForTeam (reads) failed: ${readsRes.error.message}`);
  }

  const reads = fetchReadMap((readsRes.data ?? []) as unknown as ReadRow[]);

  type IssueWithProject = IssueRow & { project: InboxProjectInfo | null };
  const issueItems: InboxFeedbackItem[] = (
    (issuesRes.data ?? []) as unknown as IssueWithProject[]
  ).map((issue) => {
    const activityAt = issue.updated_at;
    const readAt = reads.get(`issue:${issue.id}`);
    const isUnread = !readAt || readAt < activityAt;
    return {
      kind: "feedback",
      id: issue.id,
      activityAt,
      isUnread,
      issue,
      project: issue.project ?? { id: issue.project_id, name: null },
    };
  });

  type QuestionWithProject = InboxQuestionThread & { project: InboxProjectInfo | null };
  const questionItems: InboxQuestionItem[] = (
    (questionsRes.data ?? []) as unknown as QuestionWithProject[]
  ).map((thread) => {
    const replies = [...(thread.replies ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const activityAt = thread.last_activity_at ?? thread.created_at;
    const readAt = reads.get(`question:${thread.id}`);
    const isUnread = !readAt || readAt < activityAt;
    return {
      kind: "question",
      id: thread.id,
      activityAt,
      isUnread,
      thread: { ...thread, replies },
      project: thread.project ?? { id: thread.project_id, name: null },
    };
  });

  // Voor `wacht_op_mij` willen we open questions alleen tonen als er klant-
  // activiteit is sinds de laatste team-reply. Heuristiek (v1, zie hieronder)
  // blijft client-side omdat ze inbox_reads + replies samen vergelijkt.
  const filteredQuestionItems =
    filter === "wacht_op_mij"
      ? questionItems.filter((q) => q.thread.status === "open" && hasUnreadClientActivity(q))
      : questionItems;

  const merged: InboxItem[] = [...issueItems, ...filteredQuestionItems];
  merged.sort((a, b) => {
    const w = sortWeight(a) - sortWeight(b);
    if (w !== 0) return w;
    return b.activityAt.localeCompare(a.activityAt);
  });

  const hasMore =
    (issuesRes.data?.length ?? 0) >= INBOX_LIST_LIMIT ||
    (questionsRes.data?.length ?? 0) >= INBOX_LIST_LIMIT;

  return { items: merged, hasMore };
}
