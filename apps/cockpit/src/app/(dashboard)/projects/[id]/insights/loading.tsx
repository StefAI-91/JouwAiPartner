export default function ProjectInsightsLoading() {
  return (
    <div className="px-4 py-8 lg:px-10">
      <div className="flex gap-4 border-b border-border/50 pb-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-5 w-32 animate-pulse rounded bg-muted" />
        ))}
      </div>
      <div className="space-y-3 pt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
