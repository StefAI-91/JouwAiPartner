import { PORTAL_STATUS_GROUPS } from "@repo/database/constants/issues";

const PLACEHOLDERS_PER_BUCKET = 3;

export default function IssuesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8" aria-busy aria-live="polite">
      <div>
        <div className="mb-2 h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PORTAL_STATUS_GROUPS.map((group) => (
          <section
            key={group.key}
            className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3"
          >
            <header className="flex items-center justify-between px-1">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-5 w-8 animate-pulse rounded-full bg-muted" />
            </header>
            <ul className="flex flex-col gap-2">
              {Array.from({ length: PLACEHOLDERS_PER_BUCKET }).map((_, i) => (
                <li
                  key={i}
                  className="h-20 animate-pulse rounded-md border border-border bg-card"
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
