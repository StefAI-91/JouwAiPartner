"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin, requireAdminInAction } from "@repo/auth/access";
import {
  updateTheme as updateThemeMutation,
  archiveTheme as archiveThemeMutation,
  createVerifiedTheme as createVerifiedThemeMutation,
} from "@repo/database/mutations/themes";
import {
  updateThemeSchema,
  archiveThemeSchema,
  createVerifiedThemeSchema,
  type UpdateThemeInput,
  type ArchiveThemeInput,
  type CreateVerifiedThemeInput,
} from "@/features/themes/validations";

/**
 * FUNC-235 — Update-action voor de theme detail page. Valideert via Zod,
 * guard via isAdmin, schrijft via `updateTheme` mutation en revalidateert
 * zowel de detail-page als het dashboard (pills tonen de nieuwe
 * emoji/name direct).
 */
export async function updateThemeAction(
  input: UpdateThemeInput,
): Promise<{ success: true } | { error: string }> {
  const parsed = updateThemeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const { themeId, name, description, matchingGuide, emoji } = parsed.data;
  const result = await updateThemeMutation(themeId, {
    name,
    description,
    matching_guide: matchingGuide,
    emoji,
  });
  if ("error" in result) return { error: result.error };

  // Dashboard + detail moeten beide opnieuw renderen. De slug wijzigt niet
  // (en mag niet via edit veranderen zonder migration); we kunnen daarom
  // `/themes/[slug]` niet pre-revalidate-en zonder de slug te kennen —
  // maar we revalidaten `/` waar pills + donut leven en laten de detail-
  // page zichzelf opnieuw ophalen bij de next navigate.
  revalidatePath("/");
  return { success: true };
}

/**
 * FUNC-236 — Archive-action. Soft-archive via mutation (status=archived,
 * archived_at=now). Thema verdwijnt van pills/donut omdat `listTopActiveThemes`
 * op `status='verified'` filtert. Bestaande meeting_themes-rijen blijven
 * staan — we willen de historische matches niet weggooien.
 */
export async function archiveThemeAction(
  input: ArchiveThemeInput,
): Promise<{ success: true } | { error: string }> {
  const parsed = archiveThemeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const result = await archiveThemeMutation(parsed.data.themeId);
  if ("error" in result) return { error: result.error };

  revalidatePath("/");
  return { success: true };
}

/**
 * Convenience: check voor client components of deze gebruiker edit-rechten
 * heeft op themes. Verbergt de edit-knop in de UI (UI-280, eerste
 * verdedigingslinie). Server Actions blijven strict authoritatief.
 */
export async function canEditThemesAction(): Promise<{ canEdit: boolean }> {
  const user = await getAuthenticatedUser();
  if (!user?.id) return { canEdit: false };
  return { canEdit: await isAdmin(user.id) };
}

/**
 * TH-010 — Admin-create een nieuw verified thema direct vanuit `/dev/detector`.
 * Overslaat de emerging → review-flow omdat de caller al admin is. Slug wordt
 * in de mutation afgeleid van name. Revalidate dashboard + review zodat de
 * pills/donut + queue meteen kloppen.
 */
export async function createVerifiedThemeAction(
  input: CreateVerifiedThemeInput,
): Promise<{ success: true; id: string; slug: string } | { error: string }> {
  const parsed = createVerifiedThemeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const result = await createVerifiedThemeMutation({
    name: parsed.data.name,
    description: parsed.data.description,
    matching_guide: parsed.data.matchingGuide,
    emoji: parsed.data.emoji,
    verifiedBy: guard.user.id,
  });
  if ("error" in result) return { error: result.error };

  revalidatePath("/");
  revalidatePath("/review");
  return { success: true, id: result.id, slug: result.slug };
}
