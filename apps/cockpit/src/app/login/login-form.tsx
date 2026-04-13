"use client";

import { useState } from "react";
import { z } from "zod";
import { createClient } from "@repo/database/supabase/client";
import { Button } from "@repo/ui/button";

const emailSchema = z.object({ email: z.string().email("Ongeldig e-mailadres") });

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ongeldig e-mailadres");
      setState("error");
      return;
    }

    setState("sending");

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (returnTo) callbackUrl.searchParams.set("next", returnTo);

    // AUTH-174 / EDGE-170: shouldCreateUser=false so unknown emails never enter
    // the system. We ignore the error and always show the "sent" state to avoid
    // leaking which addresses are registered (user enumeration).
    await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-6 text-center">
          <p className="text-sm font-medium">Check je inbox</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Als dit e-mailadres toegang heeft, ontvang je een magic link. Klik op de link om in te
            loggen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setState("idle");
            setEmail("");
          }}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Andere e-mail gebruiken
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="je@email.nl"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={state === "sending"}
        className="w-full glow-primary"
        size="lg"
      >
        {state === "sending" ? "Bezig..." : "Stuur magic link"}
      </Button>
    </form>
  );
}
