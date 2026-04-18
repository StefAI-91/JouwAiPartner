export default function IssuesLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="space-y-3 text-center">
        <div className="mx-auto size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Issues laden...</p>
      </div>
    </div>
  );
}
