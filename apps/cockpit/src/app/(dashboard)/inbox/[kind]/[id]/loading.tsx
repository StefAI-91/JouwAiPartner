export default function ConversationLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-border/40 px-6 py-3.5">
        <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />
        <div className="space-y-1">
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex-1 space-y-3 px-8 py-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "" : "flex-row-reverse"} gap-2.5`}>
            <div className="h-7 w-7 rounded-full bg-muted" />
            <div className="h-16 w-2/3 rounded-2xl bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
