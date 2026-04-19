export default function DevExtractorLoading() {
  return (
    <div className="px-4 py-8 lg:px-10">
      <div className="mb-6">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-7 w-72 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-[28rem] animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
