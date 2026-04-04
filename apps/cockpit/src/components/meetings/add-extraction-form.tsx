"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { createExtractionAction } from "@/actions/entities";
import {
  EXTRACTION_TYPE_LABELS,
  EXTRACTION_TYPE_ICONS,
  EXTRACTION_TYPE_COLORS,
} from "@/components/shared/extraction-constants";

interface AddExtractionFormProps {
  meetingId: string;
}

const TYPES = ["decision", "action_item", "need", "insight"] as const;

export function AddExtractionForm({ meetingId }: AddExtractionFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<typeof TYPES[number]>("decision");
  const [content, setContent] = useState("");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createExtractionAction({
        meeting_id: meetingId,
        type,
        content: content.trim(),
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setContent("");
        setType("decision");
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
        Add Extraction
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Extraction">
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

          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => {
                const Icon = EXTRACTION_TYPE_ICONS[t];
                const config = EXTRACTION_TYPE_COLORS[t];
                const isActive = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-input text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {Icon && <Icon className="size-4" style={{ color: config?.color }} />}
                    {EXTRACTION_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              rows={4}
              placeholder="Describe the decision, action item, need, or insight..."
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !content.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
