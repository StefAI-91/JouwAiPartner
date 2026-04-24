export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 lg:px-10">
      <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 animate-pulse rounded bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-64 animate-pulse rounded bg-muted" />
          <div className="h-3 w-96 animate-pulse rounded bg-muted/70" />
          <div className="h-3 w-40 animate-pulse rounded bg-muted/50" />
        </div>
      </div>
      <div className="h-28 animate-pulse rounded-xl border border-dashed border-border/60 bg-muted/20" />
    </div>
  );
}
