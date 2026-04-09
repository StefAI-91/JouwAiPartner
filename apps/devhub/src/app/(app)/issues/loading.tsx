export default function IssuesLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-7 w-32 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
