"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, X, Info } from "lucide-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { formatDate } from "@repo/ui/format";
import type { EmergingThemeRow, EmergingThemeProposalMeeting } from "@repo/database/queries/themes";
import type { ThemeEmoji } from "@repo/ai/agents/theme-emojis";
import { EmojiPickerPopover } from "./emoji-picker-popover";
import { approveThemeAction, rejectEmergingThemeAction } from "@/actions/themes";

export interface ThemeApprovalCardProps {
  theme: EmergingThemeRow;
}

/**
 * UI-291/292/293/294/295/296: approval-card voor één emerging theme. Stef/
 * Wouter kunnen inline name + description + matching_guide + emoji editten
 * voordat ze goedkeuren. De "Gevonden in:" strook toont de 2-3 meetings die
 * de AI als bewijs gaf, met link naar de meeting-detail.
 *
 * Drie acties:
 *  - Goedkeuren — `approveThemeAction` → status='verified'
 *  - Samenvoegen — v2 via Curator-agent, nu disabled met tooltip
 *  - Afwijzen — `rejectEmergingThemeAction` → status='archived'
 */
export function ThemeApprovalCard({ theme }: ThemeApprovalCardProps) {
  const [name, setName] = useState(theme.name);
  const [description, setDescription] = useState(theme.description);
  const [matchingGuide, setMatchingGuide] = useState(theme.matching_guide);
  const [emoji, setEmoji] = useState<ThemeEmoji>(theme.emoji as ThemeEmoji);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, startApprove] = useTransition();
  const [isRejecting, startReject] = useTransition();

  const canSubmit =
    name.trim().length >= 2 && description.trim().length >= 5 && matchingGuide.trim().length >= 20;

  function handleApprove() {
    if (!canSubmit) return;
    setError(null);
    startApprove(async () => {
      const result = await approveThemeAction({
        themeId: theme.id,
        name: name.trim(),
        description: description.trim(),
        matching_guide: matchingGuide.trim(),
        emoji,
      });
      if ("error" in result) setError(result.error);
    });
  }

  function handleReject() {
    setError(null);
    startReject(async () => {
      const result = await rejectEmergingThemeAction({ themeId: theme.id });
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <article className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <header className="flex items-start gap-4">
        <EmojiPickerPopover
          value={emoji}
          onSelect={setEmoji}
          triggerLabel="Kies emoji voor dit voorgestelde thema"
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={80}
              aria-label="Thema-naam"
              className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-[15px] font-semibold text-foreground hover:border-border focus-visible:border-primary/60 focus-visible:outline-none"
            />
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800">
              emerging
            </span>
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minLength={5}
            maxLength={200}
            aria-label="Beschrijving"
            className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] text-muted-foreground hover:border-border focus-visible:border-primary/60 focus-visible:outline-none"
          />
        </div>
      </header>

      <div className="mt-4 space-y-1">
        <label
          htmlFor={`matching-guide-${theme.id}`}
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Matching guide
        </label>
        <textarea
          id={`matching-guide-${theme.id}`}
          value={matchingGuide}
          onChange={(e) => setMatchingGuide(e.target.value)}
          minLength={20}
          rows={3}
          className="w-full rounded-md border border-border/60 bg-muted/10 px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground focus-visible:border-primary/60 focus-visible:outline-none"
        />
      </div>

      {theme.proposal_meetings.length > 0 && <FoundInSection meetings={theme.proposal_meetings} />}

      {error && (
        <div className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          Voorgesteld op {formatDate(theme.created_at)}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled
            className={cn("cursor-not-allowed gap-1 opacity-60")}
            title="Samenvoegen met bestaand thema — komt in v2 via Curator-agent."
          >
            <Info className="h-3.5 w-3.5" /> Samenvoegen…
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReject}
            disabled={isApproving || isRejecting}
            className="gap-1"
          >
            <X className="h-3.5 w-3.5" /> Afwijzen
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApprove}
            disabled={!canSubmit || isApproving || isRejecting}
            className="gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            {isApproving ? "Goedkeuren..." : "Goedkeuren"}
          </Button>
        </div>
      </footer>
    </article>
  );
}

function FoundInSection({ meetings }: { meetings: EmergingThemeProposalMeeting[] }) {
  return (
    <section className="mt-4 space-y-2">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Gevonden in {meetings.length === 1 ? "deze meeting" : `deze ${meetings.length} meetings`}
      </div>
      <ul className="space-y-2">
        {meetings.map((m) => (
          <li
            key={m.meeting_id}
            className="rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-[12.5px]"
          >
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/meetings/${m.meeting_id}`}
                className="font-medium text-foreground hover:text-primary hover:underline"
              >
                {m.title ?? "(meeting zonder titel)"}
              </Link>
              <span className="font-mono text-[10px] text-muted-foreground">
                {formatDate(m.date)}
              </span>
            </div>
            <blockquote className="mt-1 border-l-2 border-primary/30 pl-2 text-muted-foreground italic">
              &ldquo;{m.evidence_quote}&rdquo;
            </blockquote>
          </li>
        ))}
      </ul>
    </section>
  );
}
