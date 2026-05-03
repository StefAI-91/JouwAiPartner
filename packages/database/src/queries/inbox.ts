import type { SupabaseClient } from "@supabase/supabase-js";
import { listAccessibleProjectIds } from "@repo/auth/access";
import { getAdminClient } from "../supabase/admin";
import { ISSUE_SELECT, type IssueRow } from "./issues";
import { markInboxItemRead } from "../mutations/inbox-reads";

// CLUSTER-WATCH (CC-008): 439+ regels (CLAUDE.md threshold 300 voor cluster-
// splitsing). Volgende substantiële toevoeging: splits in
// queries/inbox/{list,counts,thread}.ts. Tot dan blijft het flat.

/**
 * CC-001 — Cockpit Inbox cross-project queries.
 *
 * Eén DB, twee views (vision §3): cockpit-team ziet alle accessible projecten,
 * portal-klant ziet eigen project. Deze file bedient alleen de cockpit-zijde.
 *
 * Strategie:
 *   1. `listAccessibleProjectIds` → project-scope (geen admin-shortcut, RLS-
 *      consistent met DevHub).
 *   2. Drie parallelle SELECTs (issues, client_questions, inbox_reads). Geen
 *      SQL UNION — verlaagt typing-precisie en bemoeilijkt embed van replies.
 *   3. Merge in JS, status-first sorted, dan activityAt DESC.
 *
 * CC-008 — `filter` wordt nu in de DB toegepast (status-sets per bucket) en
 * de result is gecapt op `INBOX_LIST_LIMIT` (200). UI cued de ceiling met
 * `hasMore`. Project-naam komt mee via een PostgREST embed op `projects(name)`.
 */

// ── Types ─────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────

interface ReadRow {
  item_kind: "issue" | "question";
  item_id: string;
  read_at: string;
}

const QUESTION_LIST_COLS =
  "id, project_id, organization_id, sender_profile_id, body, status, created_at, last_activity_at" as const;

const QUESTION_REPLY_EMBED = `replies:client_questions!parent_id (
  id, body, sender_profile_id, created_at
)` as const;

// Status-first sort weight. Lager = hoger in de lijst. Vision §9 — items die
// op de PM wachten staan altijd bovenaan, parked items onderaan.
function sortWeight(item: InboxItem): number {
  if (item.kind === "feedback") {
    if (item.issue.status === "needs_pm_review") return 0;
    if (item.issue.status === "deferred") return 3;
    return 2;
  }
  // question
  return item.thread.status === "open" ? 1 : 4;
}

function fetchReadMap(rows: ReadRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(`${r.item_kind}:${r.item_id}`, r.read_at);
  }
  return map;
}

// ── Public queries ────────────────────────────────────────────────────────

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

/**
 * Open question is "wacht op mij" als er klant-activiteit is. In v1 hebben
 * replies geen role-veld, dus we benaderen het op count: replies > 0 ÓF
 * onread (geen team-read sinds laatste activiteit). Pragmatisch tot CC-002
 * reply-role bijhoudt.
 */
function hasUnreadClientActivity(item: InboxQuestionItem): boolean {
  return item.isUnread || item.thread.replies.length > 0;
}

/**
 * Counts voor sidebar-badge en filter-chips. Vier kleine count-queries i.p.v.
 * de hele lijst — goedkoper want index-only.
 *
 * `unread` telt items waar nog geen read-row is OF read_at < activityAt.
 * Kan in één SQL met FILTER, maar PostgREST exposed dat niet zonder RPC.
 * Voor v1 lossen we dat client-side op (één extra fetch van de full list);
 * bij >10k items ooit: cache of move naar realtime-subscribed counter.
 */
export async function countInboxItemsForTeam(
  profileId: string,
  options: { projectId?: string } = {},
  client?: SupabaseClient,
): Promise<InboxCounts> {
  const db = client ?? getAdminClient();
  const accessibleIds = await listAccessibleProjectIds(profileId, db);
  if (accessibleIds.length === 0) {
    return { pmReview: 0, openQuestions: 0, deferred: 0, unread: 0 };
  }
  const projectIds = options.projectId
    ? accessibleIds.includes(options.projectId)
      ? [options.projectId]
      : []
    : accessibleIds;
  if (projectIds.length === 0) {
    return { pmReview: 0, openQuestions: 0, deferred: 0, unread: 0 };
  }

  const [pmRes, openQRes, deferredRes, listResult] = await Promise.all([
    db
      .from("issues")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds)
      .eq("status", "needs_pm_review"),
    db
      .from("client_questions")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds)
      .is("parent_id", null)
      .eq("status", "open"),
    db
      .from("issues")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds)
      .eq("status", "deferred"),
    listInboxItemsForTeam(profileId, options, db),
  ]);

  return {
    pmReview: pmRes.count ?? 0,
    openQuestions: openQRes.count ?? 0,
    deferred: deferredRes.count ?? 0,
    unread: listResult.items.filter((i) => i.isUnread).length,
  };
}

// ── Detail-route ──────────────────────────────────────────────────────────

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

/**
 * Ophalen + auto-mark-as-read voor de detail-route. Mark-as-read draait pas
 * NA de fetch zodat een eventuele nieuwe activity die gelijktijdig binnenkomt
 * niet ten onrechte als "gezien" wordt gemarkeerd.
 *
 * `options.projectIds` overschrijft de standaard team-scoping (CC-006). Het
 * portal vraagt deze query aan voor één klant-project en passeert de
 * pre-gevalideerde project-id zelf — `listAccessibleProjectIds` is
 * team-only (`devhub_project_access`) en zou voor klanten leeg teruggeven.
 */
export async function getConversationThread(
  kind: InboxItemKind,
  id: string,
  profileId: string,
  client?: SupabaseClient,
  options: { projectIds?: string[] } = {},
): Promise<ConversationThread | null> {
  const db = client ?? getAdminClient();
  const projectIds = options.projectIds ?? (await listAccessibleProjectIds(profileId, db));
  if (projectIds.length === 0) return null;

  if (kind === "feedback") {
    const { data, error } = await db
      .from("issues")
      .select(ISSUE_SELECT)
      .eq("id", id)
      .in("project_id", projectIds)
      .maybeSingle();

    if (error) throw new Error(`getConversationThread (feedback) failed: ${error.message}`);
    if (!data) return null;

    const issue = data as unknown as IssueRow;
    const messages: ConversationMessage[] = [
      {
        id: `issue:${issue.id}`,
        body: issue.client_description ?? issue.description ?? issue.client_title ?? issue.title,
        sender_profile_id: "",
        created_at: issue.created_at,
        sender: issue.reporter_name ? { id: "", full_name: issue.reporter_name } : null,
      },
    ];

    await markInboxItemRead(profileId, "issue", id, db);
    return { kind: "feedback", issue, messages };
  }

  // kind === "question"
  const { data: root, error: rootError } = await db
    .from("client_questions")
    .select(`${QUESTION_LIST_COLS}, ${QUESTION_REPLY_EMBED}`)
    .eq("id", id)
    .in("project_id", projectIds)
    .is("parent_id", null)
    .maybeSingle();

  if (rootError) throw new Error(`getConversationThread (question) failed: ${rootError.message}`);
  if (!root) return null;

  const thread = root as unknown as InboxQuestionThread;
  const orderedReplies = [...(thread.replies ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  // Sender-profielen ophalen voor root + alle replies in één query.
  const senderIds = Array.from(
    new Set([thread.sender_profile_id, ...orderedReplies.map((r) => r.sender_profile_id)]),
  );
  const sendersMap = new Map<string, { id: string; full_name: string | null }>();
  if (senderIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name")
      .in("id", senderIds);
    for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null }>) {
      sendersMap.set(p.id, p);
    }
  }

  const messages: ConversationMessage[] = [
    {
      id: thread.id,
      body: thread.body,
      sender_profile_id: thread.sender_profile_id,
      created_at: thread.created_at,
      sender: sendersMap.get(thread.sender_profile_id) ?? null,
    },
    ...orderedReplies.map((r) => ({
      id: r.id,
      body: r.body,
      sender_profile_id: r.sender_profile_id,
      created_at: r.created_at,
      sender: sendersMap.get(r.sender_profile_id) ?? null,
    })),
  ];

  await markInboxItemRead(profileId, "question", id, db);
  return { kind: "question", thread: { ...thread, replies: orderedReplies }, messages };
}

/**
 * Single-item header-fetch voor de detail-route — zelfde shape als de list.
 * Gebruikt door header-component voor titel/project/status zonder de hele
 * conversation te hoeven re-renderen.
 */
export async function getInboxItemForDetail(
  kind: InboxItemKind,
  id: string,
  profileId: string,
  client?: SupabaseClient,
): Promise<InboxItem | null> {
  const db = client ?? getAdminClient();
  const projectIds = await listAccessibleProjectIds(profileId, db);
  if (projectIds.length === 0) return null;

  if (kind === "feedback") {
    const { data, error } = await db
      .from("issues")
      .select(`${ISSUE_SELECT}, project:projects(id, name)`)
      .eq("id", id)
      .in("project_id", projectIds)
      .maybeSingle();
    if (error) throw new Error(`getInboxItemForDetail (feedback) failed: ${error.message}`);
    if (!data) return null;
    const issue = data as unknown as IssueRow & { project: InboxProjectInfo | null };
    return {
      kind: "feedback",
      id: issue.id,
      activityAt: issue.updated_at,
      isUnread: false,
      issue,
      project: issue.project ?? { id: issue.project_id, name: null },
    };
  }

  const { data, error } = await db
    .from("client_questions")
    .select(`${QUESTION_LIST_COLS}, ${QUESTION_REPLY_EMBED}, project:projects(id, name)`)
    .eq("id", id)
    .in("project_id", projectIds)
    .is("parent_id", null)
    .maybeSingle();
  if (error) throw new Error(`getInboxItemForDetail (question) failed: ${error.message}`);
  if (!data) return null;
  const thread = data as unknown as InboxQuestionThread & { project: InboxProjectInfo | null };
  const replies = [...(thread.replies ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const activityAt = thread.last_activity_at ?? thread.created_at;
  return {
    kind: "question",
    id: thread.id,
    activityAt,
    isUnread: false,
    thread: { ...thread, replies },
    project: thread.project ?? { id: thread.project_id, name: null },
  };
}
