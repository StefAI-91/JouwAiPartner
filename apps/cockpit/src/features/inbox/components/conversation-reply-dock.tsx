"use client";

import { useState, useTransition } from "react";
import { Send, Paperclip } from "lucide-react";
import { replyAsTeamAction } from "../actions/replies";

/**
 * Reply-dock onderaan een question-thread. Plain text v1; paperclip is een
 * placeholder (attachments komen later). Helper-tekst maakt expliciet dat
 * de klant de naam ziet — voorkomt verraste reactie van team-leden.
 */
export function ConversationReplyDock({
  parentId,
  clientName,
}: {
  parentId: string;
  clientName?: string | null;
}) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isValid = body.trim().length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError(null);
    startTransition(async () => {
      const res = await replyAsTeamAction({ parent_id: parentId, body: body.trim() });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setBody("");
    });
  };

  return (
    <form onSubmit={onSubmit} className="border-t border-border/40 bg-background px-6 py-3">
      <div className="flex items-end gap-2 rounded-xl bg-muted/40 px-3 py-2 ring-1 ring-foreground/[0.06] focus-within:ring-foreground/[0.18]">
        <button
          type="button"
          disabled
          title="Bijlages komen later"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-50"
        >
          <Paperclip className="h-3.5 w-3.5" />
        </button>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={1}
          placeholder="Antwoord namens team — ⏎ om te verzenden"
          className="flex-1 resize-none bg-transparent py-1 text-[12.5px] leading-snug text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          disabled={!isValid || isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11.5px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "…" : "Verstuur"}
          <Send className="h-3 w-3" />
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-muted-foreground/60">
        Antwoord namens team — {clientName ?? "de klant"} ziet je naam in het portal.
      </p>
      {error ? <p className="mt-1 px-1 text-[10px] text-destructive">{error}</p> : null}
    </form>
  );
}
