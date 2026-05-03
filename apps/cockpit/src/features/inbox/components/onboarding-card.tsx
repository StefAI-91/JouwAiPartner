"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { dismissOnboardingAction } from "../actions/preferences";

// CC-005 — uitleg-kaart bovenaan de cockpit-inbox (zowel globale als
// per-project view). Eén key (`cockpit_inbox`) — dismissed in één view = weg
// in beide. Optimistic hide, geen retry-loop bij action-failure.

export function OnboardingCard() {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();

  if (hidden) return null;

  function handleDismiss() {
    setHidden(true);
    startTransition(async () => {
      const result = await dismissOnboardingAction({ key: "cockpit_inbox" });
      if ("error" in result) {
        console.error("[OnboardingCard cockpit] dismiss failed:", result.error);
      }
    });
  }

  return (
    <Card className="relative mx-4 mt-4 border-violet-200 bg-violet-50/60 lg:mx-6">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Sluit uitleg"
        className="absolute right-3 top-3 rounded p-1 text-muted-foreground transition-colors hover:bg-violet-100 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <CardContent className="space-y-3 pr-10">
        <h3 className="text-base font-semibold">Welkom in de cockpit-inbox</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Hier verzamelen we klant-feedback en open berichten die nog jouw aandacht vragen.</li>
          <li>
            Klant-feedback wacht op endorsement vóór het in de DevHub-backlog landt — keur goed,
            wijs af, of zet on-hold met een korte uitleg.
          </li>
          <li>Berichten kun je direct beantwoorden vanuit de conversatie-weergave.</li>
        </ul>
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          Begrepen, dank
        </Button>
      </CardContent>
    </Card>
  );
}
