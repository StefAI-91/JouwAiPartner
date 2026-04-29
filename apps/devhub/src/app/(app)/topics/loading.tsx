export default function TopicsLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-7 w-32 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}
