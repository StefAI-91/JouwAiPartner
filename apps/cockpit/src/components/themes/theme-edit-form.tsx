"use client";

import { useState, useTransition } from "react";
import type { ThemeRow } from "@repo/database/queries/themes";
import type { ThemeEmoji } from "@repo/ai/agents/theme-emojis";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { EmojiPickerPopover } from "./emoji-picker-popover";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateThemeAction, archiveThemeAction } from "@/actions/themes";

export interface ThemeEditFormProps {
  theme: ThemeRow;
  /** Wordt aangeroepen nadat update/archive succesvol is, om view-mode te herstellen. */
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Edit-mode formulier voor een theme. Stef/Wouter bewerken name / description
 * / matching_guide / emoji en klikken Opslaan. Archive-knop zet status op
 * `archived` na een confirm-dialog — historische matches blijven bestaan.
 *
 * UI-277: alleen beschikbaar voor `status='verified'`; emerging themes gaan
 * via de review-flow (TH-006). Parent `ThemeDetailView` geeft deze component
 * dus niet weer bij emerging.
 */
export function ThemeEditForm({ theme, onDone, onCancel }: ThemeEditFormProps) {
  const [name, setName] = useState(theme.name);
  const [description, setDescription] = useState(theme.description);
  const [matchingGuide, setMatchingGuide] = useState(theme.matching_guide);
  const [emoji, setEmoji] = useState<ThemeEmoji>(theme.emoji as ThemeEmoji);
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isSavingTransition, startSaving] = useTransition();
  const [isArchivingTransition, startArchiving] = useTransition();

  const isDirty =
    name !== theme.name ||
    description !== theme.description ||
    matchingGuide !== theme.matching_guide ||
    emoji !== theme.emoji;

  const canSubmit =
    name.trim().length >= 2 && description.trim().length >= 5 && matchingGuide.trim().length >= 20;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startSaving(async () => {
      const result = await updateThemeAction({
        themeId: theme.id,
        name: name.trim(),
        description: description.trim(),
        matching_guide: matchingGuide.trim(),
        emoji,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  function handleArchiveConfirm() {
    setError(null);
    startArchiving(async () => {
      const result = await archiveThemeAction({ themeId: theme.id });
      if ("error" in result) {
        setError(result.error);
        setArchiveOpen(false);
        return;
      }
      setArchiveOpen(false);
      onDone();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-border/60 bg-card p-5"
    >
      <div className="flex items-start gap-4">
        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Emoji
          </label>
          <EmojiPickerPopover
            value={emoji}
            onSelect={setEmoji}
            triggerLabel="Kies emoji voor dit thema"
          />
        </div>
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <label
              htmlFor="theme-name"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Naam
            </label>
            <input
              id="theme-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={80}
              required
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="theme-description"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Description
            </label>
            <input
              id="theme-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minLength={5}
              maxLength={200}
              required
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-[14px] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="theme-matching-guide"
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Matching guide
        </label>
        <textarea
          id="theme-matching-guide"
          value={matchingGuide}
          onChange={(e) => setMatchingGuide(e.target.value)}
          minLength={20}
          rows={5}
          required
          className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-[12.5px] leading-relaxed focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        <p className="text-[11px] text-muted-foreground">
          Format: &quot;Valt onder als X / valt er niet onder als Y (→ naburig thema)&quot;. Deze
          tekst wordt als arbiter in de ThemeTagger-prompt gebruikt.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className={cn("text-destructive hover:bg-destructive/10")}
          onClick={() => setArchiveOpen(true)}
          disabled={isSavingTransition || isArchivingTransition}
        >
          Archiveer thema
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSavingTransition || isArchivingTransition}
          >
            Annuleren
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit || !isDirty || isSavingTransition || isArchivingTransition}
          >
            {isSavingTransition ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchiveConfirm}
        title="Thema archiveren?"
        description={`"${theme.name}" verdwijnt van het dashboard (pills + donut). Bestaande matches blijven bewaard.`}
        confirmLabel="Archiveren"
        loading={isArchivingTransition}
      />
    </form>
  );
}
