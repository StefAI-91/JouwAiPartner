import { PORTAL_BUCKETS, type PortalBucketKey } from "@repo/database/constants/topics";
import type { TopicListRow } from "@repo/database/queries/topics";
import { SectionHeader } from "./section-header";
import { TopicCard } from "./topic-card";
import { EmptyState } from "./empty-states";

const BUCKET_BLURB: Record<PortalBucketKey, string> = {
  recent_done: "Opgeleverd in de afgelopen veertien dagen",
  upcoming: "Wat in de huidige of eerstvolgende sprint zit",
  high_prio: "Geprioriteerd, nog geen sprint toegewezen",
  awaiting_input: "Wachtend op jullie signaal",
};

interface RoadmapBoardProps {
  buckets: Record<PortalBucketKey, TopicListRow[]>;
  issueCounts: Map<string, number>;
  projectId: string;
}

export function RoadmapBoard({ buckets, issueCounts, projectId }: RoadmapBoardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {PORTAL_BUCKETS.map((bucket, idx) => {
          const topics = buckets[bucket.key];
          const isLast = idx === PORTAL_BUCKETS.length - 1;

          return (
            <div
              key={bucket.key}
              className={`flex flex-col gap-4 border-border p-5 ${
                isLast ? "" : "border-b xl:border-b-0"
              } ${idx < 3 ? "xl:border-r" : ""} ${idx % 2 === 0 ? "md:border-r" : ""}`}
            >
              <SectionHeader
                label={bucket.label}
                count={topics.length}
                blurb={BUCKET_BLURB[bucket.key]}
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
