export default function InboxLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      {/* Lijst-pane skeleton */}
      <aside className="border-b md:w-[360px] md:shrink-0 md:border-b-0 md:border-r">
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-md border border-border/40 p-3">
              <div className="h-3 w-1/3 rounded bg-muted" />
              <div className="mt-2 h-3 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      </aside>
      {/* Detail-pane skeleton */}
      <main className="hidden flex-1 items-center justify-center md:flex">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </main>
    </div>
  );
}
