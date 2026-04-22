import { z } from "zod";
import { ALL_THEME_EMOJIS } from "@repo/ai/agents/theme-emojis";

/**
 * Zod-schema voor de edit-form op de theme detail page (TH-005).
 * Gedeeld met de updateThemeAction + review-approve flow (TH-006).
 */
export const updateThemeSchema = z.object({
  themeId: z.string().uuid(),
  name: z.string().min(2).max(80),
  description: z.string().min(5).max(200),
  matching_guide: z.string().min(20),
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
