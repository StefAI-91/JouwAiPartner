"use client";

import { useState, useTransition } from "react";
import { replyAsClientAction } from "@/actions/inbox";

/**
 * PR-023 — inline reply-form per vraag in de portal-inbox.
 *
 * Submit roept `replyAsClientAction(projectId, { parent_id, body })`. Bij
 * success: klant-rol triggert in de mutation een status-flip naar
 * `responded` op de parent, waarna `revalidatePath(/inbox)` de vraag uit de
 * lijst laat verdwijnen op de volgende render.
 */
export interface ClientReplyFormProps {
  projectId: string;
  parentId: string;
}

export function ClientReplyForm({ projectId, parentId }: ClientReplyFormProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = body.trim();
    if (!trimmed) {
      setError("Antwoord mag niet leeg zijn");
      return;
    }

    startTransition(async () => {
      const result = await replyAsClientAction(projectId, {
        parent_id: parentId,
        body: trimmed,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      // Op success laten we de revalidate de lijst verversen — de vraag
      // verdwijnt vanzelf zodra parent.status flipt naar `responded`.
      setBody("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor={`reply-${parentId}`} className="sr-only">
        Antwoord
      </label>
      <textarea
        id={`reply-${parentId}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={5000}
        disabled={isPending}
        placeholder="Schrijf je antwoord..."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
      />
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Versturen..." : "Verstuur antwoord"}
        </button>
      </div>
    </form>
  );
}
