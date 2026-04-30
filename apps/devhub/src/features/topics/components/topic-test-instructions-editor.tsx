"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { updateTopicAction } from "../actions/topics";

const TEXTAREA_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20";

export interface TopicTestInstructionsEditorProps {
  topicId: string;
  initialInstructions: string | null;
}

/**
 * CP-010 — Editor voor `client_test_instructions`. Wordt prominent getoond
 * op de topic-detail pagina: zonder gevulde instructies verschijnt het topic
 * niet in de "Klaar om te testen"-sectie van de Portal Briefing. Markdown
 * mag — Portal rendert vooralsnog `whitespace-pre-wrap`, geen full markdown
 * parser nodig in v1.
 *
 * Geen auto-save (zelfde patroon als TopicResolutionEditor) zodat het team
 * bewust een moment kiest om "naar de klant pushen" expliciet te maken.
 */
export function TopicTestInstructionsEditor({
  topicId,
  initialInstructions,
}: TopicTestInstructionsEditorProps) {
  const router = useRouter();
  const [instructions, setInstructions] = useState(initialInstructions ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = (instructions.trim() || "") !== (initialInstructions ?? "");

  const save = () => {
    startTransition(async () => {
      setError(null);
      const result = await updateTopicAction({
        id: topicId,
        client_test_instructions: instructions.trim() || null,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-md border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Test-instructies voor klant
        </h2>
        <span className="text-xs italic text-muted-foreground">
          Zonder dit blijft het topic onzichtbaar in de Portal-briefing.
        </span>
      </div>

      <textarea
        rows={6}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        className={TEXTAREA_CLASS}
        maxLength={5000}
        placeholder={
          "Hoe te testen:\n1. Open de preview en login\n2. Klik op het zoek-icoon\n3. Verwacht: resultaten verschijnen na 2-3 letters"
        }
      />

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending || !dirty}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
          Opslaan
        </button>
        {savedAt && !dirty ? (
          <span className="text-xs text-muted-foreground">Opgeslagen.</span>
        ) : null}
      </div>
    </section>
  );
}
