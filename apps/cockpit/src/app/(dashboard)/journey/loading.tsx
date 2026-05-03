export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-7 w-72 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
