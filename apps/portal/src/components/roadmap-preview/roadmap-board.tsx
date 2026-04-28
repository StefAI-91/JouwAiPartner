import { BUCKETS, getTopicsByBucket } from "./mock-data";
import { TopicCard } from "./topic-card";

const cssVars: Record<string, { bg: string; rule: string; ink: string }> = {
  fixed: {
    bg: "var(--bucket-fixed-bg)",
    rule: "var(--bucket-fixed-rule)",
    ink: "var(--bucket-fixed-ink)",
  },
  soon: {
    bg: "var(--bucket-soon-bg)",
    rule: "var(--bucket-soon-rule)",
    ink: "var(--bucket-soon-ink)",
  },
  priority: {
    bg: "var(--bucket-priority-bg)",
    rule: "var(--bucket-priority-rule)",
    ink: "var(--bucket-priority-ink)",
  },
  unprio: {
    bg: "var(--bucket-unprio-bg)",
    rule: "var(--bucket-unprio-rule)",
    ink: "var(--bucket-unprio-ink)",
  },
};

export function RoadmapBoard({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const isMobile = variant === "mobile";

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-[var(--paper-elevated)] ${
        isMobile ? "max-w-[420px] mx-auto" : ""
      }`}
      style={{ borderColor: "var(--rule-hairline)" }}
    >
      {/* Project header */}
      <div
        className="flex items-baseline justify-between gap-4 border-b px-6 py-5"
        style={{ borderColor: "var(--rule-hairline)" }}
      >
        <div>
          <p className="section-marker mb-1.5">Project — CAI Studio</p>
          <h3 className="font-display text-[1.5rem] leading-[1.1] tracking-tight text-[var(--ink)]">
            Roadmap
          </h3>
        </div>
        <div className="hidden md:flex items-baseline gap-4 font-mono text-[11px] text-[var(--ink-muted)]">
          <span>
            <span className="num-tabular text-[var(--ink-soft)]">14</span> topics
          </span>
          <span
            className="h-3 w-px"
            style={{ backgroundColor: "var(--rule-hairline)" }}
            aria-hidden
          />
          <span>
            Bijgewerkt <span className="num-tabular">vandaag</span>
          </span>
        </div>
      </div>

      {/* Buckets */}
      <div
        className={isMobile ? "flex flex-col" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}
      >
        {BUCKETS.map((bucket, idx) => {
          const topics = getTopicsByBucket(bucket.key);
          const colors = cssVars[bucket.cssVarPrefix]!;
          const isLast = idx === BUCKETS.length - 1;

          return (
            <div
              key={bucket.key}
              className={`flex flex-col gap-4 p-5 ${isMobile ? (isLast ? "" : "border-b") : ""} ${
                !isMobile
                  ? `border-b lg:border-b-0 ${
                      idx < 3 ? "lg:border-r" : ""
                    } ${idx % 2 === 0 ? "md:border-r" : ""}`
                  : ""
              }`}
              style={{
                borderColor: "var(--rule-hairline)",
                backgroundColor: colors.bg,
              }}
            >
              {/* Bucket header */}
              <header className="pb-3" style={{ borderBottom: `1px solid ${colors.rule}` }}>
                <div className="flex items-baseline justify-between gap-3">
                  <h4
                    className="font-display text-[1.05rem] tracking-tight"
                    style={{ color: colors.ink }}
                  >
                    {bucket.label}
                  </h4>
                  <span
                    className="font-mono num-tabular text-[12px] tabular-nums"
                    style={{ color: colors.ink, opacity: 0.7 }}
                  >
                    {bucket.count.toString().padStart(2, "0")}
                  </span>
                </div>
                <p
                  className="mt-1 text-[12px] leading-snug"
                  style={{ color: colors.ink, opacity: 0.7 }}
                >
                  {bucket.blurb}
                </p>
              </header>

              {/* Topics */}
              <div className="flex flex-col gap-3">
                {topics.map((t) => (
                  <TopicCard
                    key={t.id}
                    topic={t}
                    showSprint={bucket.key === "coming_week"}
                    showSignalBadge={bucket.key !== "unprioritized" && t.clientSignal !== null}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
