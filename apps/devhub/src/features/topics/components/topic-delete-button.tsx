"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTopicAction } from "../actions/topics";

interface TopicDeleteButtonProps {
  topicId: string;
  /**
   * Project waar het topic onder valt — bepaalt de redirect na succesvolle
   * delete. Zonder dit zou /topics zonder ?project= geladen worden en
   * forceert de ProjectSwitcher een reset naar het eerste project.
   */
  projectId: string;
  /** Aantal gekoppelde issues — als > 0 toont de knop een waarschuwing. */
  linkedCount: number;
}

/**
 * Delete-knop met inline confirmatie (geen modal). Faalt expliciet als er
 * issues gekoppeld zijn — dat geeft de DB-mutation in PR-002 ook terug; we
 * tonen de error gewoon aan de gebruiker zodat duidelijk is waarom delete
 * geweigerd wordt.
 */
export function TopicDeleteButton({ topicId, projectId, linkedCount }: TopicDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    startTransition(async () => {
      setError(null);
      const result = await deleteTopicAction({ id: topicId });
      if ("error" in result) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.push(`/topics?project=${projectId}`);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex h-9 items-center self-start rounded-md border border-destructive/40 bg-destructive/5 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Verwijder topic
        </button>
        {linkedCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            Topic heeft {linkedCount} gekoppelde issue(s); ontkoppel ze eerst voor je verwijdert.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
      <p className="text-sm">Weet je het zeker? Dit kan niet ongedaan gemaakt worden.</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={onConfirm}
          className="inline-flex h-8 items-center rounded-md bg-destructive px-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Verwijderen…" : "Ja, verwijder"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setConfirming(false)}
          className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          Annuleren
        </button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
