import { PORTAL_BUCKETS } from "@repo/database/constants/topics";

const PLACEHOLDERS_PER_BUCKET = 3;

export default function RoadmapLoading() {
  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8" aria-busy aria-live="polite">
      <div>
        <div className="mb-2 h-6 w-32 animate-pulse rounded bg-[var(--paper-deep)]" />
        <div className="h-4 w-72 animate-pulse rounded bg-[var(--paper-deep)]/70" />
      </div>
      <div
        className="overflow-hidden rounded-lg border bg-[var(--paper-elevated)]"
        style={{ borderColor: "var(--rule-hairline)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          {PORTAL_BUCKETS.map((bucket) => (
            <div
              key={bucket.key}
              className="flex flex-col gap-4 p-5"
              style={{ borderColor: "var(--rule-hairline)" }}
            >
              <div className="flex items-baseline justify-between gap-3 pb-3">
                <div className="h-5 w-32 animate-pulse rounded bg-[var(--paper-deep)]" />
                <div className="h-4 w-6 animate-pulse rounded bg-[var(--paper-deep)]" />
              </div>
              <div className="flex flex-col gap-3">
                {Array.from({ length: PLACEHOLDERS_PER_BUCKET }).map((_, i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-md border bg-[var(--paper-elevated)]"
                    style={{ borderColor: "var(--rule-hairline)" }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
