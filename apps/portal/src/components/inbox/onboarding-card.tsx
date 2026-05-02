"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { dismissOnboardingAction } from "@/actions/preferences";

// CC-005 — eerste-keer-bezoeker krijgt een korte uitleg-kaart in z'n inbox.
// Dismissable via X of "Begrepen, dank"-knop; persisteert via server-action
// naar `profiles.preferences.dismissed_onboarding.portal_inbox`. Optimistic
// hide — als de server-call faalt komt de card terug bij volgende navigate
// (bewuste keuze: instant UX, geen retry-loops).

export function OnboardingCard() {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();

  if (hidden) return null;

  function handleDismiss() {
    setHidden(true);
    startTransition(async () => {
      const result = await dismissOnboardingAction({ key: "portal_inbox" });
      if ("error" in result) {
        // Stille fallback: bij volgende refresh leest de page de DB-state.
        // Geen toast — dismissal is een laag-stakes UX-actie.
        console.error("[OnboardingCard] dismiss failed:", result.error);
      }
    });
  }

  return (
    <Card className="relative mb-6 border-violet-200 bg-violet-50/60">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Sluit uitleg"
        className="absolute right-3 top-3 rounded p-1 text-muted-foreground transition-colors hover:bg-violet-100 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <CardContent className="space-y-3 pr-10">
        <h3 className="text-base font-semibold">Welkom in je inbox</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Hier komen alle vragen en updates van het Jouw AI Partner team.</li>
          <li>Je krijgt een mail wanneer er iets nieuws is — je hoeft hier niet te wachten.</li>
          <li>Je kunt direct antwoorden op een bericht; we zien het meteen aan onze kant.</li>
        </ul>
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          Begrepen, dank
        </Button>
      </CardContent>
    </Card>
  );
}
