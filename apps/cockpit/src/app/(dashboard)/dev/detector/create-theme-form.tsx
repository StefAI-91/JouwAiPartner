"use client";

import { useState, useTransition } from "react";
import { ALL_THEME_EMOJIS } from "@repo/ai/agents/theme-emojis";
import { createVerifiedThemeAction } from "@/features/themes/actions";

const EMOJI_CHOICES = ALL_THEME_EMOJIS;

/**
 * TH-010/TH-011 — Inline create-form voor een nieuw verified thema.
 * Overslaat de emerging → review-flow; bedoeld voor de admin-curator-pad
 * vanuit `/dev/detector`. Bij succes reset de form en wordt `onCreated`
 * aangeroepen zodat de parent het resultaat-paneel kan verversen.
 */
export function CreateThemeForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [matchingGuide, setMatchingGuide] = useState("");
  const [emoji, setEmoji] = useState<string>(EMOJI_CHOICES[0]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ name: string; slug: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit =
    name.trim().length >= 2 &&
    description.trim().length >= 5 &&
    matchingGuide.trim().length >= 20 &&
    emoji.length > 0 &&
    !isPending;

  const submit = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await createVerifiedThemeAction({
        name: name.trim(),
        description: description.trim(),
        matchingGuide: matchingGuide.trim(),
        emoji: emoji as (typeof EMOJI_CHOICES)[number],
      });
      if ("error" in res) {
        setError(res.error);
      } else {
        setSuccess({ name: name.trim(), slug: res.slug });
        setName("");
        setDescription("");
        setMatchingGuide("");
        setEmoji(EMOJI_CHOICES[0]);
        onCreated?.();
      }
    });
  };

  return (
    <section className="rounded-xl border border-border/60 bg-card p-4">
      <details>
        <summary className="cursor-pointer text-sm font-semibold hover:underline">
          Nieuw thema toevoegen (admin, direct verified)
        </summary>
        <div className="mt-3 space-y-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Naam (2–80 chars)
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
              placeholder="Bijv. Klantonboarding"
              maxLength={80}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Omschrijving (5–200 chars, UI-display)
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
              placeholder="Eén zin die het thema uitlegt."
              maxLength={200}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Matching guide (min 20 chars — arbiter voor de Tagger)
            <textarea
              value={matchingGuide}
              onChange={(e) => setMatchingGuide(e.target.value)}
              disabled={isPending}
              rows={4}
              className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm leading-snug"
              placeholder={
                "Valt onder als het over X gaat — bijvoorbeeld Y of Z.\nValt er niet onder als het alleen een terzijde is over A."
              }
            />
            <span className="text-[10px] text-muted-foreground">
              Tip: volg het “Valt onder als … / Valt er niet onder als …” patroon van bestaande
              themes. Dit is wat de LLM als beslissings-signaal gebruikt.
            </span>
          </label>

          <div>
            <span className="text-xs font-medium text-muted-foreground">Emoji</span>
            <ul className="mt-1 flex flex-wrap gap-1">
              {EMOJI_CHOICES.map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    onClick={() => setEmoji(e)}
                    disabled={isPending}
                    className={
                      emoji === e
                        ? "rounded-md border-2 border-primary bg-primary/10 px-2 py-1 text-lg"
                        : "rounded-md border border-border/60 bg-background px-2 py-1 text-lg hover:bg-muted/40"
                    }
                  >
                    {e}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
              Thema <strong>{success.name}</strong> aangemaakt (slug: <code>{success.slug}</code>).
              Het staat direct in de Tagger-catalogus voor volgende runs.
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "Aanmaken…" : "Thema aanmaken (verified)"}
          </button>
        </div>
      </details>
    </section>
  );
}
