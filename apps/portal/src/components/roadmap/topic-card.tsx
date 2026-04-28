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
      <article
        className="flex flex-col gap-3 rounded-md border bg-[var(--paper-elevated)] p-5 transition-colors hover:bg-white"
        style={{ borderColor: "var(--rule-hairline)" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <TypeBadge type={topic.type} />
          <PriorityBadge priority={topic.priority} />
        </div>

        <h3 className="font-display text-[1.35rem] leading-[1.2] tracking-tight text-[var(--ink)]">
          {heading}
        </h3>

        <div
          className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-dashed"
          style={{ borderColor: "var(--rule-soft)" }}
        >
          <MetaItem prefix="Onderwerpen">
            <span className="text-[var(--ink-soft)]">{linkedIssuesCount}</span>
          </MetaItem>
          <MetaItem prefix={dateLabel}>
            <span className="text-[var(--ink-soft)]">{dateValue}</span>
          </MetaItem>
        </div>
      </article>
    </Link>
  );
}
