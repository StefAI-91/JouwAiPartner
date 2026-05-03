"use client";

import { useState, useTransition } from "react";
import { MessageCircleQuestion } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/dialog";
import { askQuestionAction } from "@/features/questions/actions/questions";

/**
 * PR-023 — knop + modal om als team een vraag aan de klant te stellen.
 *
 * `topicId` of `issueId` is optioneel; wanneer meegegeven hangt de vraag aan
 * dat topic/issue (zie XOR-CHECK uit PR-022). De action leidt
 * `organization_id` zelf af uit het project — caller hoeft alleen `projectId`
 * door te geven, en mag niet gespoofed worden vanuit de payload.
 */
export interface AskQuestionModalProps {
  projectId: string;
  topicId?: string;
  issueId?: string;
  triggerLabel?: string;
}

export function AskQuestionModal({
  projectId,
  topicId,
  issueId,
  triggerLabel = "Stel vraag aan klant",
}: AskQuestionModalProps) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setBody("");
    setDueDate("");
    setError(null);
    setSuccess(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = body.trim();
    if (trimmed.length < 10) {
      setError("Vraag moet minimaal 10 tekens bevatten");
      return;
    }

    startTransition(async () => {
      const result = await askQuestionAction({
        project_id: projectId,
        body: trimmed,
        topic_id: topicId ?? null,
        issue_id: issueId ?? null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSuccess("Vraag verzonden");
      setBody("");
      setDueDate("");
      // Korte vertraging zodat de gebruiker de bevestiging ziet.
      setTimeout(() => close(), 800);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
      >
        <MessageCircleQuestion className="size-3.5" />
        {triggerLabel}
      </button>

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stel een vraag aan de klant</DialogTitle>
            <DialogDescription>
              De klant ziet deze vraag in zijn portaal-inbox. Je krijgt een reply zodra hij antwoord
              geeft.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="question-body" className="mb-1 block text-sm font-medium">
                Vraag
              </label>
              <textarea
                id="question-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                maxLength={2000}
                required
                disabled={isPending}
                placeholder="Bijv: kunnen jullie de logo's in SVG aanleveren?"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {body.trim().length} / 2000 tekens (minimaal 10)
              </p>
            </div>

            <div>
              <label htmlFor="question-due" className="mb-1 block text-sm font-medium">
                Antwoord gewenst voor (optioneel)
              </label>
              <input
                id="question-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={isPending || body.trim().length < 10}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Versturen..." : "Verstuur"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
