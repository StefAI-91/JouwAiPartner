"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Bug, Check, HelpCircle, Lightbulb, Loader2, Plus } from "lucide-react";
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
  Icon: typeof Bug;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: "bug", label: "Melding", helper: "Er gaat iets mis", Icon: Bug },
  { value: "feature_request", label: "Wens", helper: "Iets extra", Icon: Lightbulb },
  { value: "question", label: "Vraag", helper: "Hoe werkt iets", Icon: HelpCircle },
];

// PR-021: bug-hint-velden — optionele context bij type=bug. Sleutels gaan
// 1-op-1 naar `issues.source_metadata`; lege strings worden server-side
// gefilterd in `submitFeedback`.
type BugHintKey = "browser" | "device" | "steps_to_reproduce" | "on_behalf_of_user";
type BugHints = Record<BugHintKey, string>;

const EMPTY_BUG_HINTS: BugHints = {
  browser: "",
  device: "",
  steps_to_reproduce: "",
  on_behalf_of_user: "",
};

const BUG_HINT_LABELS: Record<BugHintKey, { label: string; placeholder: string }> = {
  browser: { label: "Browser", placeholder: "Bijv. Chrome 120 op MacOS" },
  device: { label: "Apparaat", placeholder: "Bijv. iPhone 14" },
  steps_to_reproduce: {
    label: "Stappen om het te reproduceren",
    placeholder: "1. Ga naar ...\n2. Klik op ...\n3. Zie dat ...",
  },
  on_behalf_of_user: {
    label: "Voor welke gebruiker speelt dit?",
    placeholder: "Bijv. een eindgebruiker — alleen als relevant",
  },
};

interface SuccessState {
  issueNumber: number;
  issueId: string;
}

export function FeedbackForm({ projectId, projectName }: FeedbackFormProps) {
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bugHints, setBugHints] = useState<BugHints>(EMPTY_BUG_HINTS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setType("bug");
    setTitle("");
    setDescription("");
    setBugHints(EMPTY_BUG_HINTS);
    setFieldErrors({});
    setServerError(null);
    setSuccess(null);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setServerError(null);

    startTransition(async () => {
      const source_metadata = type === "bug" ? bugHints : undefined;
      const result = await submitFeedback({
        project_id: projectId,
        title,
        description,
        type,
        source_metadata,
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
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-card shadow-sm ring-1 ring-primary/20">
            <Check className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Bedankt voor je feedback</h2>
              <p className="text-sm text-foreground/80">
                We hebben je feedback aangemaakt als{" "}
                <span className="rounded bg-card px-1.5 py-0.5 font-mono text-xs font-medium text-primary ring-1 ring-primary/20">
                  #{success.issueNumber}
                </span>
                . Het team van {projectName} ontvangt het direct en pakt het op.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/20 bg-card px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                Nog een indienen
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      {/* Type — segmented control */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Wat wil je indienen?</h2>
        <div
          role="radiogroup"
          aria-label="Type indiening"
          className="grid grid-cols-3 gap-1.5 rounded-lg border border-border bg-card p-1"
        >
          {TYPE_OPTIONS.map((option) => {
            const isActive = type === option.value;
            const { Icon } = option;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setType(option.value)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-md px-3 py-2.5 text-left transition-colors",
                  isActive ? "bg-foreground text-background" : "text-foreground hover:bg-muted/60",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <Icon className="size-3.5" />
                  <span className="text-sm font-semibold">{option.label}</span>
                </span>
                <span
                  className={cn(
                    "text-[11px]",
                    isActive ? "text-background/70" : "text-muted-foreground",
                  )}
                >
                  {option.helper}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Title */}
      <section className="space-y-1.5">
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
          className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {fieldErrors.title?.length ? (
          <p className="text-xs text-destructive">{fieldErrors.title[0]}</p>
        ) : null}
      </section>

      {/* Description */}
      <section className="space-y-1.5">
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
          className="block w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {fieldErrors.description?.length ? (
          <p className="text-xs text-destructive">{fieldErrors.description[0]}</p>
        ) : null}
      </section>

      {/* Bug context — inline section met linker accent (geen geneste card) */}
      {type === "bug" ? (
        <section className="border-l-2 border-primary/30 pl-5">
          <div className="mb-4">
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              Optionele context
              <span className="rounded-sm bg-muted px-1.5 py-px text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Bij melding
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Hoe vollediger, hoe sneller we kunnen helpen.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["browser", "device"] as const).map((key) => {
              const meta = BUG_HINT_LABELS[key];
              const id = `feedback-hint-${key}`;
              return (
                <div key={key} className="space-y-1">
                  <label htmlFor={id} className="text-xs font-medium text-foreground/80">
                    {meta.label}
                  </label>
                  <input
                    id={id}
                    type="text"
                    value={bugHints[key]}
                    onChange={(e) => setBugHints((prev) => ({ ...prev, [key]: e.target.value }))}
                    maxLength={500}
                    placeholder={meta.placeholder}
                    className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-1">
            <label htmlFor="feedback-hint-steps" className="text-xs font-medium text-foreground/80">
              {BUG_HINT_LABELS.steps_to_reproduce.label}
            </label>
            <textarea
              id="feedback-hint-steps"
              value={bugHints.steps_to_reproduce}
              onChange={(e) =>
                setBugHints((prev) => ({ ...prev, steps_to_reproduce: e.target.value }))
              }
              rows={3}
              maxLength={2000}
              placeholder={BUG_HINT_LABELS.steps_to_reproduce.placeholder}
              className="block w-full resize-y rounded-md border border-border bg-card px-2.5 py-1.5 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="mt-4 space-y-1">
            <label htmlFor="feedback-hint-user" className="text-xs font-medium text-foreground/80">
              {BUG_HINT_LABELS.on_behalf_of_user.label}
            </label>
            <input
              id="feedback-hint-user"
              type="text"
              value={bugHints.on_behalf_of_user}
              onChange={(e) =>
                setBugHints((prev) => ({ ...prev, on_behalf_of_user: e.target.value }))
              }
              maxLength={500}
              placeholder={BUG_HINT_LABELS.on_behalf_of_user.placeholder}
              className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </section>
      ) : null}

      {serverError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      ) : null}

      {/* Submit */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? "Versturen..." : "Feedback versturen"}
          {!pending ? <ArrowRight className="size-4" /> : null}
        </button>
        <p className="text-xs text-muted-foreground">
          Je feedback gaat direct naar het team van{" "}
          <span className="font-medium text-foreground/80">{projectName}</span>.
        </p>
      </div>
    </form>
  );
}
