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
