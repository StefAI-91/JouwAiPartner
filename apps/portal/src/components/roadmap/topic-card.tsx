import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { timeAgoDays } from "@repo/ui/format";
import type { TopicListRow } from "@repo/database/queries/topics";

interface TopicCardProps {
  topic: TopicListRow;
  projectId: string;
  linkedIssuesCount: number;
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-destructive",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-muted-foreground/40",
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "urgent",
  high: "hoog",
  medium: "midden",
  low: "laag",
};

export function TopicCard({ topic, projectId, linkedIssuesCount }: TopicCardProps) {
  const heading = topic.client_title ?? topic.title;
  const isClosed = topic.closed_at !== null;
  const dateLabel = isClosed ? "Gesloten" : "Bijgewerkt";
  const dateValue = timeAgoDays(isClosed ? topic.closed_at! : topic.updated_at);

  const typeAccent = topic.type === "bug" ? "border-l-rose-400/70" : "border-l-emerald-400/70";

  const priorityKey = topic.priority ?? null;
  const priorityDot = priorityKey ? PRIORITY_DOT[priorityKey] : null;
  const priorityLabel = priorityKey ? PRIORITY_LABEL[priorityKey] : null;

  return (
    <Link
      href={`/projects/${projectId}/roadmap/${topic.id}`}
      className={`group block rounded-md border border-border/60 ${typeAccent} border-l-2 bg-card px-3 py-2.5 no-underline shadow-soft-sm transition-all duration-200 hover:-translate-y-px hover:border-border hover:shadow-soft`}
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-[14px] font-medium leading-snug text-foreground">{heading}</p>
        <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{linkedIssuesCount}</span>{" "}
          {linkedIssuesCount === 1 ? "onderwerp" : "onderwerpen"}
        </span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-baseline gap-1">
          <span>{dateLabel}</span>
          <span>{dateValue}</span>
        </span>
        {priorityKey && priorityDot && priorityLabel ? (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <span className={`size-1.5 rounded-full ${priorityDot}`} aria-hidden />
              prio {priorityLabel}
            </span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
