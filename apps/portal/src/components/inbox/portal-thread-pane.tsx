import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ConversationThread } from "@repo/database/queries/inbox";
import { PortalConversationBubbles } from "./portal-conversation-bubbles";
import { ClientReplyForm } from "./client-reply-form";

/**
 * PR-026 — Detail-pane voor de portal-inbox. Vervangt
 * `portal-conversation-view.tsx` (was full-page narrow column). Render in
 * de rechter-pane van de two-pane layout, met header → bubbles → reply-dock
 * verticaal gestapeld zodat de bubbles scrollbaar blijven en de reply-dock
 * altijd onderaan zichtbaar is.
 *
 * Op mobile (`<md`) is dit de enige zichtbare pane; back-knop navigeert
 * terug naar de lijst. Op desktop is de back-knop verborgen — de lijst-pane
 * staat al naast de detail.
 */
export function PortalThreadPane({
  projectId,
  thread,
  currentProfileId,
}: {
  projectId: string;
  thread: Extract<ConversationThread, { kind: "question" }>;
  currentProfileId: string;
}) {
  const status = thread.thread.status;
  const statusPill =
    status === "responded"
      ? { label: "Beantwoord", classes: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
      : { label: "Wacht op antwoord", classes: "bg-amber-50 text-amber-700 ring-amber-200" };

  const title = makeTitle(thread.thread.body);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div className="min-w-0 flex-1">
          <Link
            href={`/projects/${projectId}/inbox`}
            className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground md:hidden"
          >
            <ArrowLeft className="size-3" />
            Terug naar inbox
          </Link>
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ring-1 ${statusPill.classes}`}
        >
          {statusPill.label}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <PortalConversationBubbles messages={thread.messages} currentProfileId={currentProfileId} />
      </div>

      <div className="border-t border-border/60 bg-background px-6 py-3">
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
