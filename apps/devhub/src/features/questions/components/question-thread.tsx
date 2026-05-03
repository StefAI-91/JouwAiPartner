"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ClientQuestionListRow } from "@repo/database/queries/client-questions";
import { replyAsTeamAction } from "@/features/questions/actions/questions";

/**
 * PR-023 — inline thread voor één klant-vraag in de DevHub-blok.
 *
 * Toont body + meta, klikbaar om de replies + team-reply-textarea uit te
 * klappen. Geen aparte detail-route in v1 — de thread blijft inline op
 * dezelfde page (zie spec PR-REQ-264).
 */
export interface QuestionThreadProps {
  question: ClientQuestionListRow;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function QuestionThread({ question }: QuestionThreadProps) {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = reply.trim();
    if (!trimmed) {
      setError("Reply mag niet leeg zijn");
      return;
    }

    startTransition(async () => {
      const result = await replyAsTeamAction({
        parent_id: question.id,
        body: trimmed,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSuccess("Reply verzonden");
      setReply("");
    });
  }

  const replyCount = question.replies.length;

  return (
    <li className="rounded-md border border-border/60 bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm text-foreground">{question.body}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateTime(question.created_at)}
            {question.due_date ? ` · deadline ${formatDateTime(question.due_date)}` : null}
            {replyCount > 0 ? ` · ${replyCount} reply${replyCount === 1 ? "" : "s"}` : null}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border/60 px-4 py-3">
          {question.replies.length > 0 && (
            <ul className="space-y-2">
              {question.replies.map((r) => (
                <li key={r.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground">
                  <p className="whitespace-pre-wrap">{r.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(r.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              maxLength={5000}
              disabled={isPending}
              placeholder="Reageer als team..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
                {success}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending || !reply.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Versturen..." : "Verstuur reply"}
              </button>
            </div>
          </form>
        </div>
      )}
    </li>
  );
}
