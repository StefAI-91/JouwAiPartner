import { notFound, redirect } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getCurrentProfile } from "@repo/auth/access";
import { getConversationThread, type InboxItemKind } from "@repo/database/queries/inbox";
import { ConversationHeader } from "./conversation-header";
import { ConversationActionBar } from "./conversation-action-bar";
import { ConversationBubbles } from "./conversation-bubbles";
import { ConversationReplyDock } from "./conversation-reply-dock";

/**
 * Composition-root voor `/inbox/[kind]/[id]`. Server-component: doet de
 * fetch + auto-mark-as-read, rendert vervolgens de vier secties.
 */
export async function ConversationPage({ kind, id }: { kind: string; id: string }) {
  if (kind !== "feedback" && kind !== "question") notFound();
  const supabase = await createPageClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect("/login");

  const thread = await getConversationThread(kind as InboxItemKind, id, profile.id, supabase);
  if (!thread) notFound();

  const showActionBar = thread.kind === "feedback" && thread.issue.status === "needs_pm_review";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <ConversationHeader thread={thread} />
      {showActionBar ? <ConversationActionBar issueId={thread.issue.id} /> : null}
      <ConversationBubbles messages={thread.messages} currentProfileId={profile.id} />
      {thread.kind === "question" ? (
        <ConversationReplyDock
          parentId={thread.thread.id}
          clientName={thread.messages[0]?.sender?.full_name ?? null}
        />
      ) : null}
    </div>
  );
}
