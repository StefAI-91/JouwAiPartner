import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;

  return (
    <div className="flex min-h-dvh">
      {/* Left: Branded panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between">
        {/* Decorative pattern */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -right-24 -bottom-24 h-[400px] w-[400px] rounded-full bg-white/8 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-white/3 blur-3xl" />
          {/* Grid pattern */}
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.04]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-16">
          {/* Logo */}
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <svg
              className="h-7 w-7 text-white"
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

          <h1 className="text-4xl font-bold tracking-tight text-white xl:text-5xl">
            Knowledge
            <br />
            Platform
          </h1>
          <p className="mt-4 max-w-sm text-lg leading-relaxed text-white/70">
            Centraliseer kennis, verrijk met AI en maak betere beslissingen.
          </p>
        </div>

        <div className="relative z-10 px-12 pb-8 xl:px-16">
          <p className="text-sm text-white/40">Jouw AI Partner</p>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 sm:px-12 lg:w-1/2">
        {/* Mobile-only branded header */}
        <div className="mb-10 text-center lg:hidden">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary glow-primary">
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
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight">Welkom terug</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Log in om door te gaan
            </p>
          </div>

          <p className="mb-6 text-sm text-muted-foreground lg:hidden">
            Log in om door te gaan
          </p>

          <LoginForm returnTo={returnTo} />

          <p className="mt-8 text-center text-xs text-muted-foreground lg:hidden">
            Jouw AI Partner &middot; Knowledge Platform
          </p>
        </div>
      </div>
    </div>
  );
}
