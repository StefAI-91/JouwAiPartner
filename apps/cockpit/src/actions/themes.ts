"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import {
  updateTheme as updateThemeMutation,
  archiveTheme as archiveThemeMutation,
} from "@repo/database/mutations/themes";
import {
  rejectThemeMatchAsAdmin,
  recalculateThemeStats,
} from "@repo/database/mutations/meeting-themes";
import { getThemeBySlug } from "@repo/database/queries/themes";
import { runTagThemesStep } from "@repo/ai/pipeline/steps/tag-themes";
import { getVerifiedMeetingById } from "@repo/database/queries/meetings";
import {
  updateThemeSchema,
  archiveThemeSchema,
  approveThemeSchema,
  rejectEmergingThemeSchema,
  rejectThemeMatchSchema,
  regenerateMeetingThemesSchema,
  type UpdateThemeInput,
  type ArchiveThemeInput,
  type ApproveThemeInput,
  type RejectEmergingThemeInput,
  type RejectThemeMatchInput,
  type RegenerateMeetingThemesInput,
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

// ──────────────────────────────────────────────────────────────────────────
// TH-006 — Review-flow, match rejections, regenerate
// ──────────────────────────────────────────────────────────────────────────

/**
 * FUNC-241 — Approve een emerging theme (met optionele inline edits op name /
 * description / matching_guide / emoji). Zet status=verified + verified_at +
 * verified_by. Inline-edit is belangrijk: de AI-reasoning die in matching_guide
 * landt na een proposal is geen production-quality guide; de reviewer mag
 * hem bijschaven voordat hij live gaat.
 */
export async function approveThemeAction(
  input: ApproveThemeInput,
): Promise<{ success: true } | { error: string }> {
  const parsed = approveThemeSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const guard = await requireThemeApprover();
  if (!guard.ok) return { error: guard.error };

  const { themeId, name, description, matching_guide, emoji } = parsed.data;
  const result = await updateThemeMutation(themeId, {
    name,
    description,
    matching_guide,
    emoji,
    status: "verified",
    verified_at: new Date().toISOString(),
    verified_by: guard.userId,
  });
  if ("error" in result) return { error: result.error };

  revalidatePath("/review");
  revalidatePath("/");
  return { success: true };
}

/**
 * FUNC-242 — Wijs een emerging theme af: soft-archive. `note` wordt (v1) niet
 * persistent opgeslagen omdat we geen kolom voor rejection-note hebben op
 * themes; we loggen hem voor audit. Bij behoefte kan een notes-kolom later
 * worden toegevoegd.
 */
export async function rejectEmergingThemeAction(
  input: RejectEmergingThemeInput,
): Promise<{ success: true } | { error: string }> {
  const parsed = rejectEmergingThemeSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const guard = await requireThemeApprover();
  if (!guard.ok) return { error: guard.error };

  if (parsed.data.note) {
    console.info(
      `[rejectEmergingTheme] ${parsed.data.themeId} rejected by ${guard.userId}: ${parsed.data.note}`,
    );
  }

  const result = await archiveThemeMutation(parsed.data.themeId);
  if ("error" in result) return { error: result.error };

  revalidatePath("/review");
  revalidatePath("/");
  return { success: true };
}

/**
 * FUNC-243 — Reject één theme-match via de ⊘-popover. Verwijdert de rij uit
 * `meeting_themes`, logt een rejection in `theme_match_rejections`, en
 * hercomputeert counts zodat dashboard-pills + detail-badge kloppen.
 */
export async function rejectThemeMatchAction(
  input: RejectThemeMatchInput,
): Promise<{ success: true; alreadyRemoved: boolean } | { error: string }> {
  const parsed = rejectThemeMatchSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const guard = await requireThemeApprover();
  if (!guard.ok) return { error: guard.error };

  const result = await rejectThemeMatchAsAdmin({
    meetingId: parsed.data.meetingId,
    themeId: parsed.data.themeId,
    reason: parsed.data.reason,
    userId: guard.userId,
  });
  if ("error" in result) return { error: result.error };

  // Recount — als de match er echt was moeten counts daadwerkelijk dalen.
  if (!result.alreadyRemoved) {
    const recalc = await recalculateThemeStats([parsed.data.themeId]);
    if ("error" in recalc) {
      console.warn(`[rejectThemeMatchAction] recalc failed: ${recalc.error}`);
    }
  }

  revalidatePath("/");
  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  return { success: true, alreadyRemoved: result.alreadyRemoved };
}

/**
 * FUNC-244 — Regenerate thema-tags voor één meeting. Whitelist-guard,
 * verwijder bestaande `meeting_themes` (FUNC-245: rejections blijven staan
 * zodat de negative_examples in de volgende run worden gerespecteerd), run
 * de tag-themes pipeline step opnieuw, revalidate. EDGE-210: een meeting
 * zonder extractions skipt de agent in de step zelf en retourneert success
 * met `skipped='no_extractions'`.
 */
export async function regenerateMeetingThemesAction(
  input: RegenerateMeetingThemesInput,
): Promise<{ success: true; matches: number; proposals: number } | { error: string }> {
  const parsed = regenerateMeetingThemesSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const guard = await requireThemeApprover();
  if (!guard.ok) return { error: guard.error };

  // Meeting ophalen om title + summary aan de step te geven. Gebruikt de
  // bestaande verified-by-id helper zodat we dezelfde route-guarding volgen.
  const meeting = await getVerifiedMeetingById(parsed.data.meetingId);
  if (!meeting) return { error: "Meeting niet gevonden of niet verified" };

  const result = await runTagThemesStep({
    meetingId: parsed.data.meetingId,
    meetingTitle: meeting.title ?? "",
    summary: meeting.summary ?? "",
    replace: true, // clear eerst — FUNC-245 leaves theme_match_rejections intact
  });

  if (result.error) return { error: result.error };

  revalidatePath("/");
  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  return {
    success: true,
    matches: result.matches_saved,
    proposals: result.proposals_saved,
  };
}
