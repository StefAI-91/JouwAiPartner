"use client";

import { useState } from "react";
import { z } from "zod";
import { createClient } from "@repo/database/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";

const emailSchema = z.object({ email: z.string().email("Ongeldig e-mailadres") });
const passwordSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});
const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Code moet 6 cijfers zijn"),
});

type MagicLinkState = "idle" | "sending" | "awaiting-code" | "verifying" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<MagicLinkState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ongeldig e-mailadres");
      setState("error");
      return;
    }

    setState("sending");

    // AUTH-174 / EDGE-170: shouldCreateUser=false + uniform success UI prevents
    // user enumeration via the OTP endpoint.
    await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { shouldCreateUser: false },
    });

    setState("awaiting-code");
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = codeSchema.safeParse({ code: code.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Code moet 6 cijfers zijn");
      return;
    }

    setState("verifying");

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: parsed.data.code,
      type: "email",
    });

    if (verifyError) {
      setError("Code is onjuist of verlopen. Controleer de code of vraag een nieuwe aan.");
      setState("awaiting-code");
      return;
    }

    router.push("/");
    router.refresh();
  }

  function handleReset() {
    setState("idle");
    setEmail("");
    setCode("");
    setError(null);
  }

  // AUTH-173: tijdelijke password-fallback voor bestaande users.
  // TODO(DH-018 follow-up): verwijder zodra iedereen overgezet is op magic link.
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPasswordLoading(true);

    const parsed = passwordSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ongeldige invoer");
      setPasswordLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (signInError) {
      setError("E-mail of wachtwoord is onjuist");
      setPasswordLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (state === "awaiting-code" || state === "verifying") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-6 text-center">
          <p className="text-sm font-medium">Check je inbox</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Als dit e-mailadres toegang heeft, ontvang je een 6-cijferige code. Vul de code
            hieronder in om in te loggen.
          </p>
        </div>

        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="code" className="block text-sm font-medium">
              Inlogcode
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-lg tracking-[0.4em] outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="123456"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={state === "verifying" || code.length !== 6}
            className="w-full glow-primary h-12 text-base"
            size="lg"
          >
            {state === "verifying" ? "Bezig..." : "Inloggen"}
          </Button>
        </form>

        <button
          type="button"
          onClick={handleReset}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Andere e-mail gebruiken
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={showPassword ? handlePasswordLogin : handleMagicLink} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="je@email.nl"
          />
        </div>

        {showPassword && (
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={state === "sending" || passwordLoading}
          className="w-full glow-primary h-12 text-base"
          size="lg"
        >
          {showPassword
            ? passwordLoading
              ? "Bezig..."
              : "Inloggen"
            : state === "sending"
              ? "Bezig..."
              : "Stuur inlogcode"}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setShowPassword((v) => !v);
            setError(null);
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showPassword ? "Liever een inlogcode?" : "Inloggen met wachtwoord"}
        </button>
      </div>
    </div>
  );
}
