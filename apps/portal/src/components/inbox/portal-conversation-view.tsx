import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { QuestionConversation } from "@repo/database/queries/inbox";
import { PortalConversationBubbles } from "./portal-conversation-bubbles";
import { ClientReplyForm } from "./client-reply-form";

/**
 * CC-006 — Portal-zijde conversation-view: header met back-knop, status-pill,
 * thread-bubbles en reply-form. Spiegelt de cockpit conversation-page maar
 * in klant-perspectief en zonder action-bar (klant kan niet endorsen/decliner).
 */
export function PortalConversationView({
  thread,
  projectId,
  projectName,
  currentProfileId,
}: {
  thread: QuestionConversation;
  projectId: string;
  projectName: string;
  currentProfileId: string;
}) {
  const status = thread.thread.status;
  const statusPill =
    status === "responded"
      ? { label: "Beantwoord", classes: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
      : { label: "Wacht op antwoord", classes: "bg-amber-50 text-amber-700 ring-amber-200" };

  const title = makeTitle(thread.thread.body);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 lg:px-12 lg:py-12">
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}/inbox`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Terug naar inbox
        </Link>
      </div>

      <header className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{projectName}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${statusPill.classes}`}
        >
          {statusPill.label}
        </span>
      </header>

      <PortalConversationBubbles messages={thread.messages} currentProfileId={currentProfileId} />

      <div className="mt-6 border-t border-border pt-4">
        <ClientReplyForm projectId={projectId} parentId={thread.thread.id} />
      </div>
    </div>
  );
}

function makeTitle(body: string): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return "Bericht";
  if (trimmed.length <= 80) return trimmed;
  return trimmed.slice(0, 80) + "…";
}
