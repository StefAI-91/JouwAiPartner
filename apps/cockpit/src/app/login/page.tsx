import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;

  return (
    <div className="relative flex min-h-full items-center justify-center px-4">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[400px] w-[400px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo / Brand */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary glow-primary">
            <svg
              className="h-6 w-6 text-primary-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
              />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Knowledge Platform</h1>
          <p className="mt-2 text-sm text-muted-foreground">Log in om door te gaan</p>
        </div>

        <LoginForm returnTo={returnTo} />

        <p className="text-center text-xs text-muted-foreground">
          Jouw AI Partner &middot; Knowledge Platform
        </p>
      </div>
    </div>
  );
}
