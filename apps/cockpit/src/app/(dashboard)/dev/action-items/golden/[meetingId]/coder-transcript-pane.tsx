"use client";

import { forwardRef } from "react";

interface Props {
  localTranscript: string;
  setLocalTranscript: (s: string) => void;
  originalTranscript: string | null;
  selectedQuote: string;
  onCaptureSelection: () => void;
}

export const CoderTranscriptPane = forwardRef<HTMLTextAreaElement, Props>(
  function CoderTranscriptPane(
    { localTranscript, setLocalTranscript, originalTranscript, selectedQuote, onCaptureSelection },
    ref,
  ) {
    const transcriptIsModified = localTranscript !== (originalTranscript ?? "");

    return (
      <section className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Transcript</h2>
          {selectedQuote && (
            <span className="text-[10.5px] text-muted-foreground">
              {selectedQuote.length} chars geselecteerd
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Bewerkbaar — plak een eigen transcript of werk in het bestaande. Selecteer tekst → klik
          &ldquo;Vang selectie&rdquo; → wordt voor-ingevuld bij het volgende nieuwe item.
          Wijzigingen blijven lokaal in deze sessie en worden niet opgeslagen.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCaptureSelection}
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] hover:bg-muted"
          >
            Vang selectie
          </button>
          {transcriptIsModified && (
            <>
              <button
                type="button"
                onClick={() => setLocalTranscript(originalTranscript ?? "")}
                className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] hover:bg-muted"
              >
                Reset naar origineel
              </button>
              <span className="text-[10.5px] italic text-amber-700">
                lokaal aangepast (niet opgeslagen)
              </span>
            </>
          )}
          {!originalTranscript && !localTranscript && (
            <span className="text-[10.5px] italic text-muted-foreground">
              Geen transcript in DB — plak er een in het veld hieronder.
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          value={localTranscript}
          onChange={(e) => setLocalTranscript(e.target.value)}
          spellCheck={false}
          className="mt-3 max-h-[480px] min-h-[260px] w-full overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/40 p-3 font-mono text-[11.5px] leading-relaxed"
          placeholder="Plak hier een transcript…"
        />
        <p className="mt-1 text-[10.5px] text-muted-foreground">
          {localTranscript.length.toLocaleString("nl-NL")} tekens
          {localTranscript.trim().length > 0 &&
            ` · ${localTranscript.trim().split(/\s+/).length.toLocaleString("nl-NL")} woorden`}
        </p>
      </section>
    );
  },
);
