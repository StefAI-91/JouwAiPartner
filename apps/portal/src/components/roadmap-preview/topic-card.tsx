import type { Topic } from "./mock-data";
import { TypeBadge, PriorityBadge, SignalBadge, MetaItem } from "./badges";

type TopicCardProps = {
  topic: Topic;
  /** When true, the linked-issues count is shown. */
  showIssueCount?: boolean;
  /** When true, sprint label is shown (use only for Komende week). */
  showSprint?: boolean;
  /** Show signal badge inline (used in non-unprio buckets to keep signal visible). */
  showSignalBadge?: boolean;
  /** Visual emphasis variant — affects density and accent. */
  emphasis?: "default" | "muted";
};

/**
 * Topic card — read-only editorial style. No drag handles, no shadows,
 * just a hairline border and tightly composed metadata row.
 */
export function TopicCard({
  topic,
  showIssueCount = true,
  showSprint = false,
  showSignalBadge = false,
  emphasis = "default",
}: TopicCardProps) {
  const isMuted = emphasis === "muted";

  return (
    <article
      className="group relative flex flex-col gap-3 rounded-md border bg-[var(--paper-elevated)] p-5 transition-colors hover:bg-white"
      style={{
        borderColor: "var(--rule-hairline)",
      }}
    >
      {/* Top row: type + priority + sprint */}
      <div className="flex flex-wrap items-center gap-3">
        <TypeBadge type={topic.type} />
        {topic.priority ? <PriorityBadge priority={topic.priority} /> : null}
        {showSprint && topic.sprintLabel ? (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]"
            style={{
              borderLeft: "1px solid var(--rule-hairline)",
              paddingLeft: "0.75rem",
            }}
          >
            {topic.sprintLabel}
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h3
        className={`font-display text-[1.35rem] leading-[1.2] tracking-tight ${isMuted ? "text-[var(--ink-soft)]" : "text-[var(--ink)]"}`}
      >
        {topic.title}
      </h3>

      {/* Description */}
      <p className="text-[14px] leading-[1.55] text-[var(--ink-soft)]">{topic.clientDescription}</p>

      {/* Bottom meta row */}
      <div
        className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-dashed"
        style={{ borderColor: "var(--rule-soft)" }}
      >
        {showIssueCount ? (
          <MetaItem prefix="Onderwerpen">
            <span className="text-[var(--ink-soft)]">{topic.linkedIssuesCount}</span>
          </MetaItem>
        ) : null}
        <MetaItem prefix={topic.closedDaysAgo !== null ? "Gesloten" : "Bijgewerkt"}>
          <span className="text-[var(--ink-soft)]">
            {topic.closedDaysAgo !== null
              ? `${topic.closedDaysAgo}d geleden`
              : `${topic.updatedDaysAgo}d geleden`}
          </span>
        </MetaItem>
        {showSignalBadge && topic.clientSignal ? (
          <span className="ml-auto">
            <SignalBadge signal={topic.clientSignal} />
          </span>
        ) : null}
      </div>
    </article>
  );
}
