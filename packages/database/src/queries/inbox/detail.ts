import type { SupabaseClient } from "@supabase/supabase-js";
import { listAccessibleProjectIds } from "@repo/auth/access";
import { getAdminClient } from "../../supabase/admin";
import { ISSUE_SELECT, type IssueRow } from "../issues";
import { markInboxItemRead } from "../../mutations/inbox-reads";
import {
  type ConversationMessage,
  type ConversationThread,
  type InboxItem,
  type InboxItemKind,
  type InboxProjectInfo,
  type InboxQuestionThread,
} from "./types";
import { QUESTION_LIST_COLS, QUESTION_REPLY_EMBED } from "./helpers";

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
