"use client";

import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { updatePartyTypeAction } from "@/features/meetings/actions";

const PARTY_TYPES = [
  { value: "internal", label: "Intern" },
  { value: "client", label: "Klant" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Overig" },
] as const;

export function PartyTypeSelector({
  meetingId,
  currentType,
}: {
  meetingId: string;
  currentType: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentLabel =
    PARTY_TYPES.find((t) => t.value === currentType)?.label ?? currentType ?? "Onbekend";

  function handleChange(value: string) {
    if (value === currentType) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updatePartyTypeAction({
        meetingId,
        partyType: value as (typeof PARTY_TYPES)[number]["value"],
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex cursor-pointer items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-muted/80"
        aria-label="Party type wijzigen"
      >
        {currentLabel}
        <Pencil className="ml-1 size-2.5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <select
        value={currentType ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="h-6 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
      >
        {PARTY_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          setError(null);
          setEditing(false);
        }}
        disabled={isPending}
        className="rounded p-0.5 hover:bg-muted"
        aria-label="Annuleren"
      >
        <X className="size-3 text-muted-foreground" />
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
