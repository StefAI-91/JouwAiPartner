export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      <div className="mt-6 space-y-4">
        <div className="h-48 animate-pulse rounded-lg border bg-muted/30" />
      </div>
    </div>
  );
}
