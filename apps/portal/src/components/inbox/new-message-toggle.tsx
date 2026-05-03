"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NewMessageForm } from "./new-message-form";

/**
 * CC-006 — Header-toggle voor de portal-compose-form. Houdt de bestaande
 * page volledig server-rendered; alleen de compose-toggle is interactief.
 */
export function NewMessageToggle({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="mb-6">
        <NewMessageForm projectId={projectId} onCancel={() => setOpen(false)} />
      </div>
    );
  }

  return (
    <div className="mb-6 flex justify-end">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        <Plus className="size-4" />
        Nieuw bericht aan team
      </button>
    </div>
  );
}
