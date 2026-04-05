"use client";

import { useState, useTransition } from "react";
import { Plus, ListChecks } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { createExtractionAction } from "@/actions/entities";

interface AddExtractionFormProps {
  meetingId: string;
}

export function AddExtractionForm({ meetingId }: AddExtractionFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createExtractionAction({
        meeting_id: meetingId,
        type: "action_item",
        content: content.trim(),
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setContent("");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
      >
        <Plus className="size-3.5" />
        Actiepunt toevoegen
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Actiepunt toevoegen">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListChecks className="size-4 text-green-600" />
            <span>Nieuw actiepunt</span>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Beschrijving</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              rows={4}
              placeholder="Beschrijf het actiepunt..."
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isPending || !content.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Toevoegen..." : "Toevoegen"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
