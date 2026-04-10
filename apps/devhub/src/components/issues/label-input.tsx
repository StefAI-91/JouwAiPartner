"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";

interface LabelInputProps {
  labels: string[];
  onAdd: (label: string) => void;
  onRemove: (label: string) => void;
}

export function LabelInput({ labels, onAdd, onRemove }: LabelInputProps) {
  const [input, setInput] = useState("");

  function handleAdd() {
    const trimmed = input.trim();
    if (trimmed && !labels.includes(trimmed)) {
      onAdd(trimmed);
    }
    setInput("");
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Labels</label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Voeg label toe en druk Enter"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          Toevoegen
        </Button>
      </div>
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {labels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
            >
              {label}
              <button
                type="button"
                onClick={() => onRemove(label)}
                className="ml-0.5 text-muted-foreground/60 hover:text-foreground"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
