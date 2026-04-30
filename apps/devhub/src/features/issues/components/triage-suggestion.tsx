"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@repo/ui/utils";

/**
 * Smart-default voor triage. Bug → Te doen, feature_request → Backlog,
 * question → Backlog (vragen zijn zelden direct werk). De knop schuift het
 * voorstel met één klik door — geen automatisme dat zonder mensoog issues
 * verplaatst.
 */
const SUGGESTIONS: Record<string, { status: "todo" | "backlog"; label: string }> = {
  bug: { status: "todo", label: "Te doen" },
  feature_request: { status: "backlog", label: "Backlog" },
  question: { status: "backlog", label: "Backlog" },
};

interface TriageSuggestionProps {
  type: string;
  status: string;
  onAccept: (status: "todo" | "backlog") => void;
  isPending: boolean;
}

export function TriageSuggestion({ type, status, onAccept, isPending }: TriageSuggestionProps) {
  if (status !== "triage") return null;
  const suggestion = SUGGESTIONS[type];
  if (!suggestion) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs">
      <Sparkles className="size-3.5 shrink-0 text-blue-600 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <p className="text-blue-900">
          Voorstel: verplaats naar <span className="font-medium">{suggestion.label}</span>
        </p>
        <button
          type="button"
          onClick={() => onAccept(suggestion.status)}
          disabled={isPending}
          className={cn(
            "rounded-md bg-blue-600 px-2 py-1 text-[0.7rem] font-medium text-white transition-colors hover:bg-blue-700",
            isPending && "opacity-50 cursor-not-allowed",
          )}
        >
          Accepteren
        </button>
      </div>
    </div>
  );
}
