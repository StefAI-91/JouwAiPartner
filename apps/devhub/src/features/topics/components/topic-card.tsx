import Link from "next/link";
import { cn } from "@repo/ui/utils";
import type { TopicListRow } from "@repo/database/queries/topics";

const TYPE_LABEL: Record<string, string> = {
  bug: "BUG",
  feature: "FEATURE",
};

const STATUS_LABEL: Record<string, string> = {
  clustering: "Clustering",
  awaiting_client_input: "Wachten op klant",
  prioritized: "Geprioriteerd",
  scheduled: "Ingepland",
  in_progress: "In uitvoering",
  done: "Klaar",
  wont_do: "Niet doen",
  wont_do_proposed_by_client: "Niet doen (klant)",
};

const PRIORITY_TONE: Record<string, string> = {
  P0: "text-red-600",
  P1: "text-orange-600",
  P2: "text-amber-600",
  P3: "text-muted-foreground",
};

interface TopicCardProps {
  topic: TopicListRow;
  linkedCount: number;
}

/**
 * Topic-rij/-kaart voor de DevHub-board. Hairline border, geen schaduw —
 * volgt §14.4 design-keuzes. Type wordt getoond als mono uppercase badge,
 * status als pill, priority als tekst-only met tone.
 */
export function TopicCard({ topic, linkedCount }: TopicCardProps) {
  return (
    <Link
      href={`/topics/${topic.id}?project=${topic.project_id}`}
      className="group flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:bg-muted"
    >
      <span
        aria-label={`Type ${TYPE_LABEL[topic.type] ?? topic.type}`}
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        ● {TYPE_LABEL[topic.type] ?? topic.type}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-hover:underline">
        {topic.title}
      </span>

      <span className="hidden text-xs text-muted-foreground sm:inline">
        {STATUS_LABEL[topic.status] ?? topic.status}
      </span>

      {topic.priority ? (
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            PRIORITY_TONE[topic.priority] ?? "text-muted-foreground",
          )}
        >
          {topic.priority}
        </span>
      ) : null}

      <span className="text-[11px] tabular-nums text-muted-foreground" title="Gekoppelde issues">
        {linkedCount}× issues
      </span>
    </Link>
  );
}
