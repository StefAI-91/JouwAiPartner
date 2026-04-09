export default function ReviewLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted/30" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-lg border bg-muted/30" />
      <div className="h-64 animate-pulse rounded-lg border bg-muted/30" />
    </div>
  );
}
