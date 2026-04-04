export default function PersonDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 flex gap-2">
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
