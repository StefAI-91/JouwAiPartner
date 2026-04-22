"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import {
  updateTheme as updateThemeMutation,
  archiveTheme as archiveThemeMutation,
} from "@repo/database/mutations/themes";
import { getThemeBySlug } from "@repo/database/queries/themes";
import {
  updateThemeSchema,
  archiveThemeSchema,
  type UpdateThemeInput,
  type ArchiveThemeInput,
} from "@/validations/themes";

/**
 * Whitelist-helper voor theme-approve/edit-acties (PRD §9.7, sprint TH-005).
 *
 * SEC-200: de sprint-tekst noemt een env-based whitelist
 * (`STEF_EMAIL` / `WOUTER_EMAIL`), maar de codebase heeft sinds DH-013 al
 * een DB-backed admin-rol op `profiles.role`. Stef en Wouter zijn de
 * gese seedde admins (AUTH-153). We gebruiken daarom `isAdmin()` als
 * enige source of truth — zo vermijden we env-drift en hoeven we geen
 * extra secrets te managen. Nieuwe admins (bijv. voor vakantie-coverage)
 * kunnen dan via de bestaande admin-team UI worden toegevoegd.
 */
async function requireThemeApprover(): Promise<
  { ok: true; userId: string } | { ok: false; error: "forbidden" }
> {
  const user = await getAuthenticatedUser();
  if (!user?.id) return { ok: false, error: "forbidden" };
  if (!(await isAdmin(user.id))) return { ok: false, error: "forbidden" };
  return { ok: true, userId: user.id };
}

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
  if (!parsed.success) return { error: "Invalid input" };

  const guard = await requireThemeApprover();
  if (!guard.ok) return { error: guard.error };

  const { themeId, name, description, matching_guide, emoji } = parsed.data;
  const result = await updateThemeMutation(themeId, {
    name,
    description,
    matching_guide,
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
  if (!parsed.success) return { error: "Invalid input" };

  const guard = await requireThemeApprover();
  if (!guard.ok) return { error: guard.error };

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
 * Helper zodat de page-component de slug→id resolve kan doen via query
 * zonder directe `.from()` buiten queries/* — hier alleen geëxporteerd als
 * re-export voor type-safety.
 */
export { getThemeBySlug };
