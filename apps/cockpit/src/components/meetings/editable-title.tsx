"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateMeetingTitleAction } from "@/actions/meetings";

export function EditableTitle({
  meetingId,
  initialTitle,
}: {
  meetingId: string;
  initialTitle: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Titel is verplicht");
      return;
    }
    if (trimmed === (initialTitle ?? "")) {
      setEditing(false);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateMeetingTitleAction({ meetingId, title: trimmed });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  function handleCancel() {
    setTitle(initialTitle ?? "");
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="group flex items-center gap-2">
        <h1 className="text-xl font-semibold">{initialTitle ?? "Naamloze meeting"}</h1>
        <button
          onClick={() => setEditing(true)}
          className="rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          aria-label="Titel bewerken"
        >
          <Pencil className="size-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          disabled={isPending}
          className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xl font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        />
        <Button size="icon-sm" onClick={handleSave} disabled={isPending} aria-label="Opslaan">
          <Check className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isPending}
          aria-label="Annuleren"
        >
          <X className="size-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
