export default function InboxLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border/40 px-6 py-4">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-7 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-6 py-2">
        <div className="h-6 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-6 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex-1 space-y-2 px-6 py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-muted" />
            <div className="h-6 w-6 rounded-full bg-muted" />
            <div className="h-3 flex-1 max-w-[60%] rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
