export default function TopicDetailLoading() {
  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8" aria-busy aria-live="polite">
      <div className="h-4 w-32 animate-pulse rounded bg-[var(--paper-deep)]" />
      <div
        className="rounded-lg border bg-[var(--paper-elevated)] overflow-hidden"
        style={{ borderColor: "var(--rule-hairline)" }}
      >
        <div className="px-7 py-5 border-b" style={{ borderColor: "var(--rule-hairline)" }}>
          <div className="flex gap-2">
            <div className="h-5 w-24 animate-pulse rounded-full bg-[var(--paper-deep)]" />
            <div className="h-5 w-16 animate-pulse rounded bg-[var(--paper-deep)]" />
          </div>
        </div>
        <div className="px-7 py-8 space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-[var(--paper-deep)]" />
          <div className="h-4 w-full animate-pulse rounded bg-[var(--paper-deep)]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--paper-deep)]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--paper-deep)]" />
        </div>
      </div>
    </div>
  );
}
