export default function EmailReviewLoading() {
  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="space-y-4">
        <div className="h-7 w-3/4 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
