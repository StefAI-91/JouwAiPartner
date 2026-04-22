"use client";

import { useState, useRef, useEffect, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Popover } from "@base-ui/react/popover";
import { cn } from "@repo/ui/utils";
import { THEME_EMOJIS, THEME_EMOJI_FALLBACK, type ThemeEmoji } from "@repo/ai/agents/theme-emojis";

export interface EmojiPickerPopoverProps {
  /** Huidige emoji-selectie — wordt met primary-ring gemarkeerd in het grid. */
  value: ThemeEmoji;
  onSelect: (emoji: ThemeEmoji) => void;
  /** A11y-label voor de trigger (bv. "Kies emoji voor dit thema"). */
  triggerLabel?: string;
  disabled?: boolean;
}

const GRID_COLS = 7;
const ALL_EMOJIS = [...THEME_EMOJIS, THEME_EMOJI_FALLBACK] as const;

/**
 * Gedeeld component dat in TH-005 (edit-mode) én TH-006 (review approval-
 * cards) wordt hergebruikt. 6×7 grid uit `THEME_EMOJIS` + `🏷️` fallback,
 * toetsenbord-navigatie via pijltjes, Home/End, Enter/Space om te kiezen.
 *
 * Discipline (UI-279): alleen waardes uit `ALL_THEME_EMOJIS` worden
 * geaccepteerd. Zod valideert dit ook nog aan de server-kant (zie
 * `updateThemeSchema`) zodat een client-bypass niet leakt.
 */
export function EmojiPickerPopover({
  value,
  onSelect,
  triggerLabel = "Kies emoji",
  disabled,
}: EmojiPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(() => {
    const i = ALL_EMOJIS.findIndex((e) => e === value);
    return i >= 0 ? i : 0;
  });
  const gridRef = useRef<HTMLDivElement>(null);

  // Reset focus naar de huidige selectie wanneer de popover opent — zo land
  // je altijd bij je current choice i.p.v. bij emoji 0.
  useEffect(() => {
    if (open) {
      const i = ALL_EMOJIS.findIndex((e) => e === value);
      setFocusIndex(i >= 0 ? i : 0);
    }
  }, [open, value]);

  // Move native focus naar de nieuwe cell zodra focusIndex wijzigt.
  useEffect(() => {
    if (!open) return;
    const grid = gridRef.current;
    if (!grid) return;
    const button = grid.querySelectorAll<HTMLButtonElement>("button[data-emoji-cell]")[focusIndex];
    button?.focus();
  }, [focusIndex, open]);

  function handleGridKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const total = ALL_EMOJIS.length;
    const lastRowStart = Math.floor((total - 1) / GRID_COLS) * GRID_COLS;
    let next = focusIndex;
    switch (event.key) {
      case "ArrowRight":
        next = Math.min(total - 1, focusIndex + 1);
        break;
      case "ArrowLeft":
        next = Math.max(0, focusIndex - 1);
        break;
      case "ArrowDown":
        next = Math.min(total - 1, focusIndex + GRID_COLS);
        break;
      case "ArrowUp":
        next = Math.max(0, focusIndex - GRID_COLS);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = lastRowStart + Math.min(GRID_COLS - 1, total - 1 - lastRowStart);
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        onSelect(ALL_EMOJIS[focusIndex]);
        setOpen(false);
        return;
      }
      default:
        return;
    }
    event.preventDefault();
    setFocusIndex(next);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        disabled={disabled}
        aria-label={triggerLabel}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-xl shadow-sm transition-colors",
          "hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span aria-hidden="true">{value}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup
            className={cn(
              "z-50 rounded-xl border border-border bg-card p-2 shadow-lg",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <div
              ref={gridRef}
              role="grid"
              aria-label="Emoji-keuze"
              onKeyDown={handleGridKey}
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
            >
              {ALL_EMOJIS.map((emoji, i) => {
                const isSelected = emoji === value;
                return (
                  <button
                    key={`${emoji}-${i}`}
                    data-emoji-cell
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected}
                    tabIndex={focusIndex === i ? 0 : -1}
                    onClick={() => {
                      onSelect(emoji);
                      setOpen(false);
                    }}
                    onFocus={() => setFocusIndex(i)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md text-xl transition-colors",
                      "hover:bg-muted focus:outline-none",
                      isSelected && "ring-2 ring-primary ring-offset-1",
                    )}
                  >
                    <span aria-hidden="true">{emoji}</span>
                  </button>
                );
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
