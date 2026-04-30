"use client";

import { useState, useTransition } from "react";
import { Bug, CheckCircle2, HelpCircle, Lightbulb, Loader2 } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { submitFeedback } from "@/actions/feedback";

interface FeedbackFormProps {
  projectId: string;
  projectName: string;
}

type FeedbackType = "bug" | "feature_request" | "question";

interface TypeOption {
  value: FeedbackType;
  label: string;
  helper: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: "bug", label: "Melding", helper: "Er gaat iets mis" },
  { value: "feature_request", label: "Wens", helper: "Ik wil graag iets extra" },
  { value: "question", label: "Vraag", helper: "Ik heb een vraag" },
];

interface SuccessState {
  issueNumber: number;
  issueId: string;
}

export function FeedbackForm({ projectId, projectName }: FeedbackFormProps) {
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setType("bug");
    setTitle("");
    setDescription("");
    setFieldErrors({});
    setServerError(null);
    setSuccess(null);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setServerError(null);

    startTransition(async () => {
      const result = await submitFeedback({
        project_id: projectId,
        title,
        description,
        type,
      });

      if ("success" in result) {
        setSuccess({ issueNumber: result.issueNumber, issueId: result.issueId });
        return;
      }

      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      setServerError(result.error);
    });
  }

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-emerald-900">
                Bedankt voor je feedback!
              </h2>
              <p className="text-sm text-emerald-900/80">
                We hebben je feedback aangemaakt als{" "}
                <span className="font-mono font-medium">#{success.issueNumber}</span> voor{" "}
                {projectName}. Het team ontvangt het direct en pakt het op.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-8 items-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                Nog een indienen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-border bg-card p-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Wat wil je indienen?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TYPE_OPTIONS.map((option) => {
            const isActive = type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-foreground/40",
                )}
              >
                {option.value === "bug" ? (
                  <Bug className="mt-0.5 size-4 shrink-0" />
                ) : option.value === "feature_request" ? (
                  <Lightbulb className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <HelpCircle className="mt-0.5 size-4 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.helper}</div>
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="feedback-title" className="text-sm font-medium text-foreground">
          Titel
        </label>
        <input
          id="feedback-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={500}
          placeholder="Kort samengevat wat er speelt"
          className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {fieldErrors.title?.length ? (
          <p className="text-xs text-destructive">{fieldErrors.title[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="feedback-description" className="text-sm font-medium text-foreground">
          Beschrijving
        </label>
        <textarea
          id="feedback-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={6}
          maxLength={10000}
          placeholder="Beschrijf zo duidelijk mogelijk wat er speelt, op welk scherm, en wat er had moeten gebeuren."
          className="block w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {fieldErrors.description?.length ? (
          <p className="text-xs text-destructive">{fieldErrors.description[0]}</p>
        ) : null}
      </div>

      {serverError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? "Versturen..." : "Feedback versturen"}
        </button>
        <span className="text-xs text-muted-foreground">
          Je feedback gaat direct naar het team van {projectName}.
        </span>
      </div>
    </form>
  );
}
