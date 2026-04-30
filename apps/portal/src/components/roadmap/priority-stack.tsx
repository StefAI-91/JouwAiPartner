import {
  PORTAL_PRIORITY_LABELS,
  mapTopicPriorityToIssuePriority,
  type IssuePriority,
} from "@repo/database/constants/issues";
import type { TopicListRow } from "@repo/database/queries/topics";
import type { PortalBucketKey } from "@repo/database/constants/topics";
import { TopicCard } from "./topic-card";

/**
 * Volgorde + tooltips voor de drie portal-prio-groepen. P1 boven want dat is
 * waar klanten vooral op letten ("wat doen jullie nu?").
 */
const PRIORITY_ORDER: IssuePriority[] = ["p1", "p2", "nice_to_have"];

const PRIORITY_BLURB: Record<IssuePriority, string> = {
  p1: "Wordt nu opgepakt of staat als eerste op de planning",
  p2: "Komt daarna aan bod",
  nice_to_have: "Mooi meegenomen wanneer er ruimte is",
};

const PRIORITY_DOT: Record<IssuePriority, string> = {
  p1: "bg-red-500",
  p2: "bg-amber-500",
  nice_to_have: "bg-muted-foreground/50",
};

interface PriorityStackProps {
  buckets: Record<PortalBucketKey, TopicListRow[]>;
  issueCounts: Map<string, number>;
  projectId: string;
}

export function PriorityStack({ buckets, issueCounts, projectId }: PriorityStackProps) {
  // Plat alle buckets, groepeer op priority. We sluiten `recent_done` uit —
  // dat is "afgelopen veertien dagen" en hoort niet thuis in een
  // "wat-staat-er-nog-te-doen" priolijst. Klanten zien de afgeronde topics
  // elders (changelog/recent done sectie indien aanwezig).
  const groups: Record<IssuePriority, TopicListRow[]> = {
    p1: [],
    p2: [],
    nice_to_have: [],
  };

  for (const key of ["upcoming", "high_prio", "awaiting_input"] as PortalBucketKey[]) {
    for (const topic of buckets[key]) {
      const prio = mapTopicPriorityToIssuePriority(topic.priority);
      groups[prio].push(topic);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {PRIORITY_ORDER.map((prio, idx) => {
        const topics = groups[prio];
        const bugs = topics.filter((t) => t.type === "bug");
        const features = topics.filter((t) => t.type === "feature");
        const dotClass = PRIORITY_DOT[prio];

        return (
          <section
            key={prio}
            className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/60 px-5 py-4">
              <div className="flex items-baseline gap-3">
                <span
                  className="font-mono text-[12px] tabular-nums text-muted-foreground/60"
                  aria-hidden
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${dotClass}`} aria-hidden />
                    <h3 className="font-heading text-[17px] font-semibold leading-tight text-foreground">
                      {PORTAL_PRIORITY_LABELS[prio]}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{PRIORITY_BLURB[prio]}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 text-xs text-muted-foreground">
                <span className="font-mono text-[18px] font-semibold leading-none tabular-nums text-foreground">
                  {topics.length}
                </span>
                <span className="ml-1">{topics.length === 1 ? "item" : "items"}</span>
                {topics.length > 0 ? (
                  <>
                    <span className="ml-2" aria-hidden>
                      ·
                    </span>
                    <span className="ml-1">
                      <span className="text-rose-600">{bugs.length}</span>
                      <span className="mx-1 text-muted-foreground/50">/</span>
                      <span className="text-emerald-700">{features.length}</span>
                    </span>
                  </>
                ) : null}
              </div>
            </header>

            <div className="grid gap-px bg-border/60 md:grid-cols-2">
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
  const dotClass = tone === "bug" ? "bg-rose-400" : "bg-emerald-400";

  return (
    <div className="bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          {title}
        </span>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground/70">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 py-3 text-center text-[11.5px] italic text-muted-foreground/80">
          {tone === "bug" ? "Geen bugs in deze prio." : "Geen openstaande wensen in deze prio."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
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
