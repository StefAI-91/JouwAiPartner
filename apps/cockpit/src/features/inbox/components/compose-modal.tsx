"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { AccessibleProject } from "@repo/database/queries/projects/access";
import { composeMessageToClientAction } from "../actions/compose";

/**
 * CC-006 — Cockpit compose-modal voor team-initiated free message naar klant.
 * Mens-naar-mens; geen AI-draft in v1. Na success redirect naar de
 * conversation-detail-pagina zodat de PM direct in het verse gesprek staat.
 */
export function ComposeModal({
  projects,
  initialProjectId,
  onClose,
}: {
  projects: AccessibleProject[];
  initialProjectId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const defaultProject =
    initialProjectId && projects.some((p) => p.id === initialProjectId)
      ? initialProjectId
      : (projects[0]?.id ?? "");
  const [projectId, setProjectId] = useState(defaultProject);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isValid = projectId.length > 0 && body.trim().length >= 10;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError(null);
    startTransition(async () => {
      const res = await composeMessageToClientAction({
        projectId,
        body: body.trim(),
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      onClose();
      router.push(`/inbox/question/${res.messageId}`);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Nieuw bericht aan klant"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-background p-6 ring-1 ring-foreground/[0.08]"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Nieuw bericht aan klant
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">
          Start een vrij gesprek met de klant. De klant ontvangt een mail met deeplink en kan in het
          portaal antwoorden.
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] font-medium text-foreground">Project</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={projects.length === 0}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none ring-1 ring-foreground/[0.04] focus:ring-foreground/[0.18]"
          >
            {projects.length === 0 ? (
              <option value="">Geen toegankelijke projecten</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-foreground">Bericht</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            maxLength={5000}
            placeholder="Schrijf je bericht aan de klant…"
            className="w-full rounded-md border border-border bg-background p-3 text-[13px] leading-relaxed text-foreground outline-none ring-1 ring-foreground/[0.04] focus:ring-foreground/[0.18]"
          />
        </label>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground/70">
          <span>{body.length}/5000 · minimum 10</span>
          {error ? <span className="text-destructive">{error}</span> : null}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[12px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={!isValid || isPending}
            className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Bezig…" : "Verstuur"}
          </button>
        </div>
      </form>
    </div>
  );
}
