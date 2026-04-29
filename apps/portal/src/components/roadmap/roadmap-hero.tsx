import { ArrowRight } from "lucide-react";
import { PORTAL_BUCKETS, type PortalBucketKey } from "@repo/database/constants/topics";
import type { TopicListRow } from "@repo/database/queries/topics";

interface RoadmapHeroProps {
  buckets: Record<PortalBucketKey, TopicListRow[]>;
}

const BUCKET_TONE: Record<PortalBucketKey, { dot: string; label: string }> = {
  recent_done: { dot: "bg-success", label: "text-success" },
  upcoming: { dot: "bg-primary", label: "text-primary" },
  high_prio: { dot: "bg-amber-500", label: "text-amber-700" },
  awaiting_input: { dot: "bg-muted-foreground/50", label: "text-muted-foreground" },
};

export function RoadmapHero({ buckets }: RoadmapHeroProps) {
  const total =
    buckets.recent_done.length +
    buckets.upcoming.length +
    buckets.high_prio.length +
    buckets.awaiting_input.length;

  return (
    <header className="border-b border-border/60 pb-6">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        Roadmap · alles op één pagina
      </p>
      <h1 className="mt-2 font-heading text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">
        Wat <span className="text-muted-foreground/50">&amp;</span> wanneer
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {total === 0 ? (
          <>Nog geen onderwerpen vastgelegd.</>
        ) : (
          <>
            <span className="font-medium text-foreground">{total} onderwerpen</span> in beweging —
            gesplitst per fase, en binnen elke fase per bug en wens.
          </>
        )}
      </p>

      {total > 0 ? (
        <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {PORTAL_BUCKETS.map((bucket, idx) => {
            const items = buckets[bucket.key];
            const tone = BUCKET_TONE[bucket.key];
            const bugs = items.filter((t) => t.type === "bug").length;
            const features = items.filter((t) => t.type === "feature").length;

            return (
              <li
                key={bucket.key}
                className="rounded-lg border border-border/60 bg-card px-3 py-2.5 shadow-soft-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[10px] tabular-nums text-muted-foreground/70"
                    aria-hidden
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className={`size-2 rounded-full ${tone.dot}`} aria-hidden />
                  <span
                    className={`text-[10.5px] font-semibold uppercase tracking-wider ${tone.label}`}
                  >
                    {bucket.label}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-heading text-[24px] font-bold leading-none tabular-nums">
                    {items.length}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    <span className="text-rose-600">{bugs}</span>
                    <span className="mx-1 text-muted-foreground/50">/</span>
                    <span className="text-emerald-700">{features}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/80">
        Scroll voor de details
        <ArrowRight className="size-3" />
      </p>
    </header>
  );
}
