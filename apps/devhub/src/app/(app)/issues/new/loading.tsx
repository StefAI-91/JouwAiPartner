export default function NewIssueLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="h-7 w-40 animate-pulse rounded bg-muted" />
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-32 animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-10 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
