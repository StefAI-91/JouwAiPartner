"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, Check } from "lucide-react";

export type DeadlineValue =
  | { kind: "label"; label: "deze week" | "vandaag" | "volgende week" }
  | { kind: "date"; iso: string }
  | { kind: "none" };

interface EditableDeadlineChipProps {
  value: DeadlineValue;
  onChange?: (value: DeadlineValue) => void;
}

const QUICK_PICKS: DeadlineValue[] = [
  { kind: "label", label: "vandaag" },
  { kind: "label", label: "deze week" },
  { kind: "label", label: "volgende week" },
  { kind: "none" },
];

function formatLabel(v: DeadlineValue): string {
  if (v.kind === "none") return "geen deadline";
  if (v.kind === "label") return v.label;
  return new Date(v.iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

function isAmber(v: DeadlineValue): boolean {
  return v.kind !== "none";
}

function isSelected(a: DeadlineValue, b: DeadlineValue): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "label" && b.kind === "label") return a.label === b.label;
  if (a.kind === "date" && b.kind === "date") return a.iso === b.iso;
  return a.kind === "none" && b.kind === "none";
}

export function EditableDeadlineChip({ value, onChange }: EditableDeadlineChipProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<DeadlineValue>(value);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!popoverRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function commit(next: DeadlineValue) {
    setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

  const amber = isAmber(internal);
  const cls = amber
    ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
    : "bg-muted text-muted-foreground hover:bg-muted/80";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors ${cls}`}
      >
        {amber && <Clock className="size-2.5" />}
        {formatLabel(internal)}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card p-2 shadow-lg"
        >
          <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Deadline
          </div>
          <ul className="space-y-0.5">
            {QUICK_PICKS.map((pick, i) => {
              const selected = isSelected(internal, pick);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => commit(pick)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                      selected ? "bg-muted/60 font-medium" : ""
                    }`}
                  >
                    <span>{formatLabel(pick)}</span>
                    {selected && <Check className="size-3.5 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 border-t border-border/60 px-2 pt-2">
            <label className="block text-[10px] font-medium text-muted-foreground">
              Specifieke datum
            </label>
            <input
              type="date"
              value={internal.kind === "date" ? internal.iso : ""}
              onChange={(e) => {
                if (e.target.value) commit({ kind: "date", iso: e.target.value });
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}
