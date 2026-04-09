import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">JAIP DevHub</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Log in om door te gaan</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
