import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ClientQuestionListRow } from "@repo/database/queries/client-questions";

const DATE_FORMATTER = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export interface QuestionCardProps {
  projectId: string;
  question: ClientQuestionListRow;
}

/**
 * Lijst-rij voor een bericht-thread in de portal-inbox. CC-006 verplaatst de
 * reply-form naar de conversation-detail-pagina; deze kaart is nu een
 * navigatie-link naar `/projects/[id]/inbox/[messageId]`.
 */
export function QuestionCard({ projectId, question }: QuestionCardProps) {
  const href = `/projects/${projectId}/inbox/${question.id}`;
  const replyCount = question.replies.length;
  const lastReply = replyCount > 0 ? question.replies[replyCount - 1] : null;

  return (
    <li>
      <Link
        href={href}
        className="block rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow"
      >
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>Gestart op {DATE_FORMATTER.format(new Date(question.created_at))}</span>
          {question.due_date ? (
            <>
              <span className="text-border">·</span>
              <span>
                Antwoord gewenst voor {DATE_FORMATTER.format(new Date(question.due_date))}
              </span>
            </>
          ) : null}
        </div>

        <p className="line-clamp-3 whitespace-pre-wrap break-words text-base leading-relaxed text-foreground">
          {question.body}
        </p>

        {lastReply ? (
          <div className="mt-3 border-l-2 border-border/60 pl-3 text-sm">
            <p className="line-clamp-2 whitespace-pre-wrap text-muted-foreground">
              {lastReply.body}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              Laatste reactie · {DATETIME_FORMATTER.format(new Date(lastReply.created_at))}
              {replyCount > 1 ? ` · ${replyCount} reacties` : ""}
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-end text-xs font-medium text-primary">
          Bekijk bericht
          <ArrowRight className="ml-1 size-3.5" />
        </div>
      </Link>
    </li>
  );
}
