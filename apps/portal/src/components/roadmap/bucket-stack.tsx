import { PORTAL_BUCKETS, type PortalBucketKey } from "@repo/database/constants/topics";
import type { TopicListRow } from "@repo/database/queries/topics";
import { Bug, Sparkles } from "lucide-react";
import { TopicCard } from "./topic-card";

const BUCKET_BLURB: Record<PortalBucketKey, string> = {
  recent_done: "Opgeleverd in de afgelopen veertien dagen",
  upcoming: "In de huidige of eerstvolgende sprint",
  high_prio: "Geprioriteerd, nog geen sprint toegewezen",
  awaiting_input: "Wacht op jullie signaal of keuze",
};

interface BucketStackProps {
  buckets: Record<PortalBucketKey, TopicListRow[]>;
  issueCounts: Map<string, number>;
  projectId: string;
}

export function BucketStack({ buckets, issueCounts, projectId }: BucketStackProps) {
  return (
    <div className="flex flex-col gap-6">
      {PORTAL_BUCKETS.map((bucket) => {
        const topics = buckets[bucket.key];
        const bugs = topics.filter((t) => t.type === "bug");
        const features = topics.filter((t) => t.type === "feature");

        return (
          <section
            key={bucket.key}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">{bucket.label}</h3>
                <p className="text-xs text-muted-foreground">{BUCKET_BLURB[bucket.key]}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{topics.length}</span>{" "}
                {topics.length === 1 ? "item" : "items"}
              </span>
            </header>

            <div className="grid gap-px bg-border md:grid-cols-2">
              <TypeColumn
                tone="bug"
                title="Bugs"
                items={bugs}
                projectId={projectId}
                issueCounts={issueCounts}
              />
              <TypeColumn
                tone="feature"
                title="Functionaliteit"
                items={features}
                projectId={projectId}
                issueCounts={issueCounts}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TypeColumn({
  tone,
  title,
  items,
  projectId,
  issueCounts,
}: {
  tone: "bug" | "feature";
  title: string;
  items: TopicListRow[];
  projectId: string;
  issueCounts: Map<string, number>;
}) {
  const Icon = tone === "bug" ? Bug : Sparkles;
  const accent =
    tone === "bug" ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300";

  return (
    <div className="bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`size-3.5 ${accent}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background/50 py-4 text-center text-xs text-muted-foreground">
          Geen {tone === "bug" ? "bugs" : "wensen"} in deze fase.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((topic) => (
            <li key={topic.id}>
              <TopicCard
                topic={topic}
                projectId={projectId}
                linkedIssuesCount={issueCounts.get(topic.id) ?? 0}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
