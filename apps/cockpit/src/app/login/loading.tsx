export default function LoginLoading() {
  return (
    <div className="flex min-h-dvh">
      <div className="relative hidden w-1/2 overflow-hidden bg-primary lg:flex" aria-hidden />
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm space-y-4">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
          <div className="mt-6 h-10 w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
