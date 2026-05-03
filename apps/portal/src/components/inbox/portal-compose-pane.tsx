"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { sendMessageAsClientAction } from "@/actions/inbox";

/**
 * PR-026 — Inline compose-pane voor klant → team berichten.
 *
 * Vervangt de oude `NewMessageToggle`-flow (modal/inline-toggle bovenaan een
 * page). Op two-pane layout is een eigen modal overbodig: we hebben de
 * rechter-pane als compose-surface. Submit redirect naar
 * `/inbox/<newMessageId>` zodat de klant direct in het verse gesprek zit
 * (matcht het cockpit compose-pattern).
 */
export function PortalComposePane({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Autofocus zodra de pane mount; klant landt typisch op deze route via
  // een klik op "+ Nieuw bericht aan team", dus directe-typstart is gewenst.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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
      router.push(`/projects/${projectId}/inbox/${result.messageId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div className="min-w-0">
          <Link
            href={`/projects/${projectId}/inbox`}
            className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground md:hidden"
          >
            <ArrowLeft className="size-3" />
            Terug naar inbox
          </Link>
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Nieuw bericht aan team
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Stel een vraag of stuur een update — het team krijgt een mail met deeplink.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <label htmlFor="portal-compose-body" className="sr-only">
          Bericht
        </label>
        <textarea
          id="portal-compose-body"
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          maxLength={5000}
          disabled={isPending}
          placeholder="Schrijf je bericht…"
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{body.length}/5000 · minimaal 10</span>
          {error ? (
            <span className="text-destructive" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border/60 bg-background px-6 py-3">
        <Link
          href={`/projects/${projectId}/inbox`}
          className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Annuleren
        </Link>
        <button
          type="submit"
          disabled={isPending || !isValid}
          className="rounded-md bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Versturen…" : "Verstuur bericht"}
        </button>
      </div>
    </form>
  );
}
