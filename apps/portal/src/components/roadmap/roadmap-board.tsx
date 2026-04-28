import { PORTAL_BUCKETS, type PortalBucketKey } from "@repo/database/constants/topics";
import type { TopicListRow } from "@repo/database/queries/topics";
import { SectionHeader } from "./section-header";
import { TopicCard } from "./topic-card";
import { EmptyState } from "./empty-states";

const BUCKET_META: Record<
  PortalBucketKey,
  { blurb: string; bg: string; rule: string; ink: string }
> = {
  recent_done: {
    blurb: "Opgeleverd in de afgelopen veertien dagen",
    bg: "var(--bucket-fixed-bg)",
    rule: "var(--bucket-fixed-rule)",
    ink: "var(--bucket-fixed-ink)",
  },
  upcoming: {
    blurb: "Wat in de huidige of eerstvolgende sprint zit",
    bg: "var(--bucket-soon-bg)",
    rule: "var(--bucket-soon-rule)",
    ink: "var(--bucket-soon-ink)",
  },
  high_prio: {
    blurb: "Geprioriteerd, nog geen sprint toegewezen",
    bg: "var(--bucket-priority-bg)",
    rule: "var(--bucket-priority-rule)",
    ink: "var(--bucket-priority-ink)",
  },
  awaiting_input: {
    blurb: "Wachtend op jullie signaal",
    bg: "var(--bucket-unprio-bg)",
    rule: "var(--bucket-unprio-rule)",
    ink: "var(--bucket-unprio-ink)",
  },
};

interface RoadmapBoardProps {
  buckets: Record<PortalBucketKey, TopicListRow[]>;
  issueCounts: Map<string, number>;
  projectId: string;
}

export function RoadmapBoard({ buckets, issueCounts, projectId }: RoadmapBoardProps) {
  return (
    <div
      className="overflow-hidden rounded-lg border bg-[var(--paper-elevated)]"
      style={{ borderColor: "var(--rule-hairline)" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {PORTAL_BUCKETS.map((bucket, idx) => {
          const topics = buckets[bucket.key];
          const meta = BUCKET_META[bucket.key];
          const isLast = idx === PORTAL_BUCKETS.length - 1;

          return (
            <div
              key={bucket.key}
              className={`flex flex-col gap-4 p-5 ${
                isLast ? "" : "border-b md:border-b xl:border-b-0"
              } ${idx < 3 ? "xl:border-r" : ""} ${idx % 2 === 0 ? "md:border-r xl:border-r" : ""}`}
              style={{
                borderColor: "var(--rule-hairline)",
                backgroundColor: meta.bg,
              }}
            >
              <SectionHeader
                label={bucket.label}
                count={topics.length}
                blurb={meta.blurb}
                inkColor={meta.ink}
                ruleColor={meta.rule}
              />

              <div className="flex flex-col gap-3">
                {topics.length === 0 ? (
                  <EmptyState bucket={bucket.key} />
                ) : (
                  topics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      projectId={projectId}
                      linkedIssuesCount={issueCounts.get(topic.id) ?? 0}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
