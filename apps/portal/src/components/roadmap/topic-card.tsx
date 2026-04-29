import Link from "next/link";
import { timeAgoDays } from "@repo/ui/format";
import type { TopicListRow } from "@repo/database/queries/topics";
import { TypeBadge, PriorityBadge, MetaItem } from "./badges";

interface TopicCardProps {
  topic: TopicListRow;
  projectId: string;
  linkedIssuesCount: number;
}

export function TopicCard({ topic, projectId, linkedIssuesCount }: TopicCardProps) {
  const heading = topic.client_title ?? topic.title;
  const isClosed = topic.closed_at !== null;
  const dateLabel = isClosed ? "Gesloten" : "Bijgewerkt";
  const dateValue = timeAgoDays(isClosed ? topic.closed_at! : topic.updated_at);

  return (
    <Link
      href={`/projects/${projectId}/roadmap/${topic.id}`}
      className="group block rounded-md no-underline"
    >
      <article className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 transition-colors hover:bg-muted/40">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={topic.type} />
          <PriorityBadge priority={topic.priority} />
        </div>

        <h3 className="text-sm font-semibold leading-snug text-foreground">{heading}</h3>

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-dashed border-border pt-2">
          <MetaItem prefix="Onderwerpen">
            <span className="text-foreground">{linkedIssuesCount}</span>
          </MetaItem>
          <MetaItem prefix={dateLabel}>
            <span className="text-foreground">{dateValue}</span>
          </MetaItem>
        </div>
      </article>
    </Link>
  );
}
