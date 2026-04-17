import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

const LOGO_URL =
  "https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "De inloglink is onvolledig. Vraag een nieuwe code aan.",
  invalid_link: "Deze inloglink is verlopen of ongeldig. Vraag een nieuwe code aan.",
  session: "Er ging iets mis bij het aanmaken van je sessie. Probeer opnieuw.",
  no_access: "Dit account heeft geen toegang tot het portaal.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Er ging iets mis bij het inloggen.")
    : null;

  return (
    <div className="flex min-h-dvh">
      {/* Left: Branded panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -right-24 -bottom-24 h-[400px] w-[400px] rounded-full bg-white/8 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-white/3 blur-3xl" />
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
          <img
            src={LOGO_URL}
            alt="Jouw AI Partner"
            className="mb-8 h-12 w-auto brightness-0 invert"
          />

          <h1 className="text-4xl font-bold tracking-tight text-white xl:text-5xl">Portaal</h1>
          <p className="mt-4 max-w-sm text-lg leading-relaxed text-white/70">
            Volg de voortgang van jouw projecten en deel feedback met het team.
          </p>
        </div>

        <div className="relative z-10 px-12 pb-8 xl:px-16">
          <p className="text-sm text-white/40">Jouw AI Partner</p>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 sm:px-12 lg:w-1/2">
        <div className="mb-10 text-center lg:hidden">
          <img src={LOGO_URL} alt="Jouw AI Partner" className="mx-auto mb-4 h-10 w-auto" />
          <h1 className="font-heading text-2xl font-bold tracking-tight">Portaal</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight">Welkom terug</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Log in om jouw projecten te bekijken
            </p>
          </div>

          <p className="mb-6 text-sm text-muted-foreground lg:hidden">
            Log in om jouw projecten te bekijken
          </p>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <LoginForm />

          <p className="mt-8 text-center text-xs text-muted-foreground lg:hidden">
            Jouw AI Partner &middot; Portaal
          </p>
        </div>
      </div>
    </div>
  );
}
