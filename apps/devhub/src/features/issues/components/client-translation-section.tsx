"use client";

import { useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { updateIssueAction } from "../actions/issues";

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20";

interface ClientTranslationSectionProps {
  issueId: string;
  /**
   * Initiële waarden uit de DB. `null` = nog geen vertaling ingevuld; portal
   * valt dan terug op `title`/`description` (CP-006 / PRD §6).
   */
  initialClientTitle: string | null;
  initialClientDescription: string | null;
}

export function ClientTranslationSection({
  issueId,
  initialClientTitle,
  initialClientDescription,
}: ClientTranslationSectionProps) {
  const [clientTitle, setClientTitle] = useState(initialClientTitle ?? "");
  const [clientDescription, setClientDescription] = useState(initialClientDescription ?? "");
  const [savedTitle, setSavedTitle] = useState(initialClientTitle ?? "");
  const [savedDescription, setSavedDescription] = useState(initialClientDescription ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isDirty = clientTitle !== savedTitle || clientDescription !== savedDescription;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) return;
    setError(null);

    startTransition(async () => {
      const result = await updateIssueAction({
        id: issueId,
        client_title: clientTitle,
        client_description: clientDescription,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSavedTitle(clientTitle);
      setSavedDescription(clientDescription);
      setSavedAt(Date.now());
    });
  }

  function handleReset() {
    setClientTitle(savedTitle);
    setClientDescription(savedDescription);
    setError(null);
  }

  // Eenvoudige indicator dat de save net is gelukt — verdwijnt zodra de
  // gebruiker weer typt (isDirty wordt true).
  const showSavedHint = !isDirty && savedAt !== null;

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2>Klant-vertaling</h2>
        <span className="text-xs text-muted-foreground">Optioneel</span>
      </div>
      <form onSubmit={handleSave} className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="space-y-1.5">
          <label htmlFor="client_title" className="text-sm font-medium">
            Klant-titel
          </label>
          <input
            id="client_title"
            value={clientTitle}
            onChange={(e) => setClientTitle(e.target.value)}
            placeholder="Optioneel — wordt getoond aan de klant"
            maxLength={200}
            className={INPUT_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="client_description" className="text-sm font-medium">
            Klant-beschrijving
          </label>
          <textarea
            id="client_description"
            value={clientDescription}
            onChange={(e) => setClientDescription(e.target.value)}
            placeholder="Optioneel — wordt getoond aan de klant"
            rows={6}
            maxLength={5000}
            className={`${INPUT_CLASS} resize-y`}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Wordt getoond aan klanten in de portal. Leeg laten = de klant ziet de oorspronkelijke
          titel/beschrijving.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          {showSavedHint && (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              Opgeslagen
            </span>
          )}
          {isDirty && (
            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              Annuleren
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!isDirty || isPending}>
            {isPending ? "Opslaan…" : "Opslaan"}
          </Button>
        </div>
      </form>
    </section>
  );
}
