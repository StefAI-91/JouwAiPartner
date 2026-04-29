"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { updateTopicAction } from "../actions/topics";

const TEXTAREA_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20";

export interface TopicResolutionEditorProps {
  topicId: string;
  initialResolution: string | null;
  initialClientResolution: string | null;
  /**
   * Open de sectie standaard. Wordt door de detailpagina op `true` gezet
   * zodra het topic in een afgeronde status zit (`done`, `wont_do`,
   * `wont_do_proposed_by_client`) of er al een resolutie ingevuld is.
   * Anders blijft de sectie ingeklapt — minder visuele ruis tijdens triage.
   */
  defaultOpen?: boolean;
}

/**
 * PR-020 — Inline-editor voor de twee resolutie-velden, op de topic-detail
 * pagina. Beide velden altijd zichtbaar, één gezamenlijke "Opslaan"-knop.
 * Niet auto-save — bewust expliciet zodat developers niet stilletjes
 * elkaars werk overschrijven tijdens typen.
 *
 * Hergebruikt `updateTopicAction` (één-op-één), dus auth, validation en
 * revalidate-paden lopen via de bestaande mutation-laag.
 */
export function TopicResolutionEditor({
  topicId,
  initialResolution,
  initialClientResolution,
  defaultOpen = false,
}: TopicResolutionEditorProps) {
  const router = useRouter();
  const [resolution, setResolution] = useState(initialResolution ?? "");
  const [clientResolution, setClientResolution] = useState(initialClientResolution ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isPending, startTransition] = useTransition();

  const dirty =
    (resolution.trim() || "") !== (initialResolution ?? "") ||
    (clientResolution.trim() || "") !== (initialClientResolution ?? "");

  const save = () => {
    startTransition(async () => {
      setError(null);
      const result = await updateTopicAction({
        id: topicId,
        resolution: resolution.trim() || null,
        client_resolution: clientResolution.trim() || null,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  };

  const hasContent = Boolean(initialResolution || initialClientResolution);

  return (
    <section className="rounded-md border border-border bg-card/50">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`}
            aria-hidden
          />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Resolutie
          </span>
          {hasContent ? <span className="text-xs text-muted-foreground">· ingevuld</span> : null}
        </span>
        <span className="text-xs italic text-muted-foreground">
          Vul in zodra het topic opgelost is.
        </span>
      </button>

      {isOpen ? (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Interne resolutie</span>
            <textarea
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className={TEXTAREA_CLASS}
              maxLength={5000}
              placeholder="Voor team-gebruik: wat was de oorzaak, hoe is het opgelost, lessen."
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Klant-resolutie</span>
            <textarea
              rows={4}
              value={clientResolution}
              onChange={(e) => setClientResolution(e.target.value)}
              className={TEXTAREA_CLASS}
              maxLength={5000}
              placeholder="Wat de klant in de Portal leest. Niet-technisch, focus op wat ze ervaren."
            />
          </label>

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
        </div>
      ) : null}
    </section>
  );
}
