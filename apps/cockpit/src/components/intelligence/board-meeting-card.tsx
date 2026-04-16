import Link from "next/link";
import { Crown, CheckSquare, GitBranch } from "lucide-react";
import type { BoardMeetingListItem } from "@repo/database/queries/meetings";

const DATE_FORMATTER = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(iso: string | null): string {
  if (!iso) return "Datum onbekend";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Datum onbekend";
  return DATE_FORMATTER.format(d);
}

function truncate(text: string, max = 200): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function BoardMeetingCard({ meeting }: { meeting: BoardMeetingListItem }) {
  const participantNames = meeting.participants.map((p) => p.name).join(", ");
  const summary = meeting.summary ? truncate(meeting.summary) : null;

  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="group block rounded-2xl border border-border/50 bg-white p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{formatDate(meeting.date)}</p>
            <h3 className="mt-0.5 font-semibold text-foreground group-hover:text-primary">
              {meeting.title ?? "(geen titel)"}
            </h3>
            {participantNames && (
              <p className="mt-0.5 text-xs text-muted-foreground">{participantNames}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <GitBranch className="h-3.5 w-3.5" />
            {meeting.decision_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5" />
            {meeting.action_item_count}
          </span>
        </div>
      </div>
      {summary && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{summary}</p>
      )}
    </Link>
  );
}
