"use client";

import { useState } from "react";
import type { ClientSignal, Topic } from "./mock-data";
import { TypeBadge, MetaItem } from "./badges";

type SignalButtonsProps = {
  topic: Topic;
  /** Initial signal state. */
  initialSignal?: ClientSignal;
  /** When true, show a small "given X days ago" hint. */
  showAgeHint?: boolean;
};

const buttonConfig: Array<{
  signal: NonNullable<ClientSignal>;
  glyph: string;
  label: string;
  hue: { bg: string; ink: string; ring: string };
}> = [
  {
    signal: "must_have",
    glyph: "🔥",
    label: "Must-have",
    hue: {
      bg: "oklch(0.96 0.025 35)",
      ink: "oklch(0.36 0.1 30)",
      ring: "oklch(0.78 0.08 30)",
    },
  },
  {
    signal: "nice_to_have",
    glyph: "👍",
    label: "Zou fijn zijn",
    hue: {
      bg: "oklch(0.96 0.018 145)",
      ink: "oklch(0.36 0.06 145)",
      ring: "oklch(0.78 0.06 145)",
    },
  },
  {
    signal: "not_relevant",
    glyph: "👎",
    label: "Niet relevant",
    hue: {
      bg: "oklch(0.95 0.005 75)",
      ink: "oklch(0.45 0.005 75)",
      ring: "oklch(0.78 0.005 75)",
    },
  },
];

export function SignalCard({
  topic,
  initialSignal = null,
  showAgeHint = false,
}: SignalButtonsProps) {
  const [signal, setSignal] = useState<ClientSignal>(initialSignal);
  const [showUndo, setShowUndo] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  function handleClick(next: NonNullable<ClientSignal>) {
    if (signal === next) {
      setSignal(null);
      return;
    }
    setSignal(next);
    if (next === "not_relevant") {
      setShowUndo(true);
      // In productie: fade-out animatie. Hier visualiseren we de undo-state
      // zonder echte timeout zodat Stef hem rustig kan bekijken.
    } else {
      setShowUndo(false);
    }
  }

  function handleUndo() {
    setSignal(null);
    setShowUndo(false);
    setHidden(false);
  }

  function handleDismiss() {
    setHidden(true);
  }

  if (hidden) {
    return (
      <div
        className="flex items-center justify-between rounded-md border-dashed border bg-[var(--paper-deep)] px-5 py-4"
        style={{ borderColor: "var(--rule-hairline)" }}
      >
        <p className="text-[13px] italic text-[var(--ink-muted)]">
          Topic verborgen op basis van jullie 👎-signaal.
        </p>
        <button
          type="button"
          onClick={handleUndo}
          className="font-mono text-[11px] uppercase tracking-[0.14em] underline-offset-4 hover:underline text-[var(--accent-brand-deep)]"
        >
          Toch tonen
        </button>
      </div>
    );
  }

  return (
    <article
      className="relative flex flex-col gap-4 rounded-md border bg-[var(--paper-elevated)] p-5"
      style={{ borderColor: "var(--rule-hairline)" }}
    >
      {/* Top meta row */}
      <div className="flex flex-wrap items-center gap-3">
        <TypeBadge type={topic.type} />
      </div>

      {/* Title + description */}
      <div>
        <h3 className="font-display text-[1.25rem] leading-[1.2] tracking-tight text-[var(--ink)]">
          {topic.title}
        </h3>
        <p className="mt-2 text-[14px] leading-[1.55] text-[var(--ink-soft)]">
          {topic.clientDescription}
        </p>
      </div>

      {/* Meta */}
      <div
        className="flex items-center gap-4 pt-2 border-t border-dashed"
        style={{ borderColor: "var(--rule-soft)" }}
      >
        <MetaItem prefix="Aangevraagd">{topic.requestedAt}</MetaItem>
        <MetaItem prefix="Onderwerpen">{topic.linkedIssuesCount}</MetaItem>
      </div>

      {/* Signal buttons */}
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {buttonConfig.map((cfg) => {
            const active = signal === cfg.signal;
            return (
              <button
                key={cfg.signal}
                type="button"
                onClick={() => handleClick(cfg.signal)}
                aria-pressed={active}
                className="group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-all"
                style={{
                  backgroundColor: active ? cfg.hue.bg : "transparent",
                  color: active ? cfg.hue.ink : "var(--ink-soft)",
                  borderColor: active ? cfg.hue.ring : "var(--rule-hairline)",
                  boxShadow: active ? `inset 0 0 0 1px ${cfg.hue.ring}` : "none",
                }}
              >
                <span aria-hidden className="text-[14px] leading-none">
                  {cfg.glyph}
                </span>
                <span className="font-medium">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active-signal subtle context */}
        {signal && signal !== "not_relevant" && (
          <p className="font-mono text-[11px] num-tabular tracking-[0.04em] text-[var(--ink-muted)]">
            Jouw signaal:{" "}
            <span className="text-[var(--ink-soft)]">
              {signal === "must_have" ? "must-have" : "zou fijn zijn"}
            </span>
            {showAgeHint ? (
              <>
                <span aria-hidden className="mx-1.5 opacity-40">
                  ·
                </span>
                gegeven 2 dagen geleden
              </>
            ) : (
              <>
                <span aria-hidden className="mx-1.5 opacity-40">
                  ·
                </span>
                zojuist
              </>
            )}
          </p>
        )}

        {/* Undo state for 👎 */}
        {signal === "not_relevant" && showUndo && (
          <div
            className="flex items-center justify-between gap-3 rounded-sm border bg-[var(--paper-cream)] px-3 py-2"
            style={{ borderColor: "var(--rule-hairline)" }}
            role="status"
          >
            <p className="text-[12.5px] text-[var(--ink-soft)]">
              Topic wordt voor jullie verborgen. Het team beoordeelt het signaal.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleUndo}
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent-brand-deep)] hover:underline underline-offset-4"
              >
                Ongedaan maken
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)] hover:underline underline-offset-4"
              >
                Sluiten
              </button>
            </div>
          </div>
        )}

        {/* Tooltip / context disclosure */}
        <button
          type="button"
          onClick={() => setTooltipOpen((v) => !v)}
          aria-expanded={tooltipOpen}
          className="self-start font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink-muted)] hover:text-[var(--ink-soft)] underline-offset-4 hover:underline"
        >
          {tooltipOpen
            ? "− Wat doet het team met dit signaal"
            : "+ Wat doet het team met dit signaal"}
        </button>

        {tooltipOpen ? (
          <div
            className="rounded-sm border-l-2 bg-[var(--paper-cream)] px-4 py-3 text-[13px] leading-[1.55] text-[var(--ink-soft)]"
            style={{ borderColor: "var(--accent-brand)" }}
          >
            Het JAIP-team gebruikt jullie signaal samen met technische complexiteit om sprints in te
            plannen. Een 🔥 betekent niet dat het altijd direct wordt opgepakt — wel dat het zwaar
            meeweegt. Geen reactie is ook een antwoord; dan parkeren we het topic.
          </div>
        ) : null}
      </div>
    </article>
  );
}
