import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ConversationThread } from "@repo/database/queries/inbox";
import { ISSUE_STATUS_LABELS } from "@repo/database/constants/issues";

/**
 * Detail-header met back-knop, titel en meta-rij. Voor feedback: bron-badge
 * + huidige status. Voor question: aantal berichten + status-pill.
 */
export function ConversationHeader({ thread }: { thread: ConversationThread }) {
  if (thread.kind === "feedback") {
    const issue = thread.issue;
    const title = issue.client_title ?? issue.title;
    const statusLabel = ISSUE_STATUS_LABELS[issue.status as keyof typeof ISSUE_STATUS_LABELS];
    return (
      <header className="flex items-center justify-between border-b border-border/40 bg-background px-6 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/inbox"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Terug naar inbox"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-foreground">{title}</p>
            <p className="text-[11px] text-muted-foreground">
              Feedback · {issue.source} · #{issue.issue_number}
            </p>
          </div>
        </div>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">
          {statusLabel}
        </span>
      </header>
    );
  }

  // question
  const t = thread.thread;
  const statusLabel = t.status === "open" ? "Wacht op klant-reactie" : "We hebben gereageerd";
  return (
    <header className="flex items-center justify-between border-b border-border/40 bg-background px-6 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/inbox"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Terug naar inbox"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-foreground">
            {t.body.slice(0, 80)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Vraag · {thread.messages.length} berichten
          </p>
        </div>
      </div>
      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">
        {statusLabel}
      </span>
    </header>
  );
}
