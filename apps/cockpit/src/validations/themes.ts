import { z } from "zod";
import { ALL_THEME_EMOJIS } from "@repo/ai/agents/theme-emojis";

/**
 * TH-008 — één bron van waarheid voor de minimum-lengtes op theme-velden.
 * Zowel de Zod-schemas hieronder als `useThemeFormState` (client-side
 * canSubmit-check) gebruiken deze constanten zodat edit-form en
 * approval-card identiek valideren.
 */
export const THEME_NAME_MIN = 2;
export const THEME_NAME_MAX = 80;
export const THEME_DESC_MIN = 5;
export const THEME_DESC_MAX = 200;
export const THEME_GUIDE_MIN = 20;

/**
 * Zod-schema voor de edit-form op de theme detail page (TH-005).
 * Gedeeld met de updateThemeAction + review-approve flow (TH-006).
 */
export const updateThemeSchema = z.object({
  themeId: z.string().uuid(),
  name: z.string().min(THEME_NAME_MIN).max(THEME_NAME_MAX),
  description: z.string().min(THEME_DESC_MIN).max(THEME_DESC_MAX),
  matchingGuide: z.string().min(THEME_GUIDE_MIN),
  emoji: z.enum(ALL_THEME_EMOJIS),
});

export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;

export const archiveThemeSchema = z.object({
  themeId: z.string().uuid(),
});

export type ArchiveThemeInput = z.infer<typeof archiveThemeSchema>;

/**
 * TH-006 — Approve emerging theme met optionele edits. Dezelfde velden als
 * update, maar `themeId` wijst naar een `status='emerging'` row en de actie
 * zet status naar `verified`.
 */
export const approveThemeSchema = updateThemeSchema;
export type ApproveThemeInput = z.infer<typeof approveThemeSchema>;

export const REJECTION_REASONS = ["niet_substantieel", "ander_thema", "te_breed"] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

/** TH-006 — emerging theme afwijzen (status='archived' + optioneel notitie). */
export const rejectEmergingThemeSchema = z.object({
  themeId: z.string().uuid(),
  note: z.string().max(200).optional(),
});
export type RejectEmergingThemeInput = z.infer<typeof rejectEmergingThemeSchema>;

/** TH-006 — Match afwijzen via ⊘ op meeting-link. */
export const rejectThemeMatchSchema = z.object({
  meetingId: z.string().uuid(),
  themeId: z.string().uuid(),
  reason: z.enum(REJECTION_REASONS),
});
export type RejectThemeMatchInput = z.infer<typeof rejectThemeMatchSchema>;

/** TH-006 — Regenerate thema-tags voor één meeting. */
export const regenerateMeetingThemesSchema = z.object({
  meetingId: z.string().uuid(),
});
export type RegenerateMeetingThemesInput = z.infer<typeof regenerateMeetingThemesSchema>;

/** TH-010 — Dry-run Tagger vanuit `/dev/tagger` harness. */
export const runDevTaggerSchema = z.object({
  meetingId: z.string().uuid(),
});
export type RunDevTaggerInput = z.infer<typeof runDevTaggerSchema>;

/**
 * TH-010 — Admin-create nieuw verified thema direct vanuit `/dev/tagger`.
 * Skipt de emerging → review-flow. Bedoeld voor de curator-pad waar Stef
 * handmatig themes seed't op basis van wat hij in de Tagger-diff ziet.
 */
export const createVerifiedThemeSchema = z.object({
  name: z.string().min(THEME_NAME_MIN).max(THEME_NAME_MAX),
  description: z.string().min(THEME_DESC_MIN).max(THEME_DESC_MAX),
  matchingGuide: z.string().min(THEME_GUIDE_MIN),
  emoji: z.enum(ALL_THEME_EMOJIS),
});
export type CreateVerifiedThemeInput = z.infer<typeof createVerifiedThemeSchema>;
