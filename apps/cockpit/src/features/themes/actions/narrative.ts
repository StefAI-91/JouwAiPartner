"use server";

import { revalidatePath } from "next/cache";
import { requireAdminInAction } from "@repo/auth/access";
import { runThemeNarrativeSynthesis } from "@repo/ai/pipeline/steps/synthesize-theme-narrative";
import { regenerateThemeNarrativeSchema, type RegenerateThemeNarrativeInput } from "../validations";

/**
 * TH-014 (FUNC-305) — Handmatige regenerate-knop voor de Verhaal-tab op een
 * theme detail page. Admin-only.
 *
 * De narrative wordt normaal automatisch geregenereerd na elke nieuwe
 * `meeting_themes` rij (pipeline-hook in `link-themes.ts`). Deze action is
 * het handmatige terugval-pad: wanneer de automatische run faalde, wanneer
 * de prompt is aangepast, of wanneer de admin twijfelt aan de laatste output.
 *
 * Revalidation gebruikt de `layout`-scope op `/themes`, zodat alle nested
 * detail-pages (`/themes/[slug]`) opnieuw gerenderd worden zonder dat we de
 * slug hoeven op te halen voor een precieze `revalidatePath`.
 */
export async function regenerateThemeNarrativeAction(
  input: RegenerateThemeNarrativeInput,
): Promise<{ success: true; skipped?: "insufficient_meetings" } | { error: string }> {
  const parsed = regenerateThemeNarrativeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const result = await runThemeNarrativeSynthesis(parsed.data.themeId);
  if (!result.success) {
    return { error: result.error ?? "Synthese mislukt" };
  }

  revalidatePath("/themes", "layout");
  return result.skipped ? { success: true, skipped: result.skipped } : { success: true };
}
