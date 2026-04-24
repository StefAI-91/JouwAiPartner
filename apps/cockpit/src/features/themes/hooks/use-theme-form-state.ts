"use client";

import { useMemo, useState } from "react";
import type { ThemeEmoji } from "@repo/ai/agents/theme-emojis";
import { THEME_NAME_MIN, THEME_DESC_MIN, THEME_GUIDE_MIN } from "../validations";

export interface UseThemeFormStateInitial {
  name: string;
  description: string;
  matching_guide: string;
  emoji: string;
}

/**
 * Pure validator die identieke grenzen hanteert als de Zod-schemas. Apart
 * geëxporteerd zodat we deze logica zonder React-runtime kunnen testen
 * (vitest node-environment in cockpit).
 */
export function computeCanSubmit(values: {
  name: string;
  description: string;
  matchingGuide: string;
}): boolean {
  return (
    values.name.trim().length >= THEME_NAME_MIN &&
    values.description.trim().length >= THEME_DESC_MIN &&
    values.matchingGuide.trim().length >= THEME_GUIDE_MIN
  );
}

/**
 * Pure dirty-check. Vergelijkt 4 velden zoals gepresenteerd in de UI.
 */
export function computeIsDirty(
  current: { name: string; description: string; matchingGuide: string; emoji: string },
  initial: UseThemeFormStateInitial,
): boolean {
  return (
    current.name !== initial.name ||
    current.description !== initial.description ||
    current.matchingGuide !== initial.matching_guide ||
    current.emoji !== initial.emoji
  );
}

/**
 * TH-008 — gedeelde form-state + validatie voor de theme edit-form
 * (`theme-edit-form.tsx`) en de approval-card in de review-flow
 * (`theme-approval-card.tsx`). Zonder deze hook dreef de validatie-
 * drempel tussen beide paden uit elkaar bij elke copy-wijziging.
 *
 * `canSubmit` volgt exact de Zod-schema-grenzen in `validations/themes.ts`
 * zodat client-side gating en server-side validatie niet divergeren.
 * `isDirty` helpt de edit-form een "Opslaan"-knop uit te grijzen wanneer
 * de gebruiker niets veranderd heeft.
 */
export function useThemeFormState(initial: UseThemeFormStateInitial) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [matchingGuide, setMatchingGuide] = useState(initial.matching_guide);
  const [emoji, setEmoji] = useState<ThemeEmoji>(initial.emoji as ThemeEmoji);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => computeCanSubmit({ name, description, matchingGuide }),
    [name, description, matchingGuide],
  );

  const isDirty = computeIsDirty({ name, description, matchingGuide, emoji }, initial);

  return {
    name,
    setName,
    description,
    setDescription,
    matchingGuide,
    setMatchingGuide,
    emoji,
    setEmoji,
    error,
    setError,
    canSubmit,
    isDirty,
  };
}
