export default function ConversationLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-6 py-8 lg:px-12 lg:py-12">
      <div className="mb-4 h-3 w-28 rounded bg-muted" />
      <div className="mb-6 border-b border-border pb-4">
        <div className="h-6 w-2/3 rounded bg-muted" />
        <div className="mt-2 h-3 w-32 rounded bg-muted" />
      </div>
      <div className="space-y-4">
        <div className="h-16 rounded-2xl bg-muted" />
        <div className="ml-auto h-16 w-3/4 rounded-2xl bg-muted" />
        <div className="h-16 w-2/3 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
