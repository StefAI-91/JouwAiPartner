"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessageAsClientAction } from "@/actions/inbox";

/**
 * CC-006 — Klant-zijde compose voor een vrij bericht aan team. Geen
 * project-selector nodig: de project-context komt uit de URL. Na success
 * navigeren we naar de conversation-detail van het zojuist verzonden
 * bericht.
 */
export interface NewMessageFormProps {
  projectId: string;
  onCancel?: () => void;
}

export function NewMessageForm({ projectId, onCancel }: NewMessageFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmed = body.trim();
  const isValid = trimmed.length >= 10;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid) {
      setError("Bericht is te kort (minimaal 10 tekens)");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await sendMessageAsClientAction(projectId, { body: trimmed });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setBody("");
      router.push(`/projects/${projectId}/inbox/${result.messageId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border bg-card p-5">
      <label htmlFor="new-message-body" className="block text-sm font-medium text-foreground">
        Nieuw bericht aan team
      </label>
      <textarea
        id="new-message-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        maxLength={5000}
        disabled={isPending}
        placeholder="Schrijf je bericht…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{body.length}/5000 · minimaal 10</span>
        {error && (
          <span className="text-destructive" role="alert">
            {error}
          </span>
        )}
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Annuleren
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || !isValid}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Versturen…" : "Verstuur bericht"}
        </button>
      </div>
    </form>
  );
}
