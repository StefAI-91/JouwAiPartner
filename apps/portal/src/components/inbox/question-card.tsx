import type { ClientQuestionListRow } from "@repo/database/queries/client-questions";
import { ClientReplyForm } from "./client-reply-form";

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

export function QuestionCard({ projectId, question }: QuestionCardProps) {
  return (
    <li className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span>Gesteld op {DATE_FORMATTER.format(new Date(question.created_at))}</span>
        {question.due_date ? (
          <>
            <span className="text-border">·</span>
            <span>Antwoord gewenst voor {DATE_FORMATTER.format(new Date(question.due_date))}</span>
          </>
        ) : null}
      </div>

      <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-foreground">
        {question.body}
      </p>

      {question.replies.length > 0 ? (
        <ul className="mt-4 space-y-2 border-l-2 border-border/60 pl-3">
          {question.replies.map((r) => (
            <li key={r.id} className="text-sm">
              <p className="whitespace-pre-wrap text-foreground">{r.body}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {DATETIME_FORMATTER.format(new Date(r.created_at))}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4">
        <ClientReplyForm projectId={projectId} parentId={question.id} />
      </div>
    </li>
  );
}
