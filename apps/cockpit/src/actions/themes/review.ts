"use server";

import { revalidatePath } from "next/cache";
import { requireAdminInAction } from "@repo/auth/access";
import {
  updateTheme as updateThemeMutation,
  archiveTheme as archiveThemeMutation,
} from "@repo/database/mutations/themes";
import {
  rejectThemeMatchAsAdmin,
  recalculateThemeStats,
} from "@repo/database/mutations/meeting-themes";
import {
  approveThemeSchema,
  rejectEmergingThemeSchema,
  rejectThemeMatchSchema,
  confirmThemeProposalSchema,
  rejectThemeProposalSchema,
  type ApproveThemeInput,
  type RejectEmergingThemeInput,
  type RejectThemeMatchInput,
  type ConfirmThemeProposalInput,
  type RejectThemeProposalInput,
} from "@/features/themes/validations";

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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const { themeId, name, description, matchingGuide, emoji } = parsed.data;
  const result = await updateThemeMutation(themeId, {
    name,
    description,
    matching_guide: matchingGuide,
    emoji,
    status: "verified",
    verified_at: new Date().toISOString(),
    verified_by: guard.user.id,
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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  if (parsed.data.note) {
    // TH-009: console.warn ipv info — CLAUDE.md staat alleen warn/error toe.
    // Structured audit-log (theme_audit_log tabel) is v2-scope.
    console.warn(
      `[rejectEmergingTheme] ${parsed.data.themeId} rejected by ${guard.user.id}: ${parsed.data.note}`,
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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const result = await rejectThemeMatchAsAdmin({
    meetingId: parsed.data.meetingId,
    themeId: parsed.data.themeId,
    reason: parsed.data.reason,
    userId: guard.user.id,
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
 * TH-011 (FUNC-280) — Confirm een voorgesteld thema vanuit de meeting-review
 * "Voorgestelde thema's" tab. Set `status='verified'` + `verified_at` +
 * `verified_by`, behoud de `meeting_themes` link. Revalidate alle
 * proposal-surfaces zodat bulk-sectie en per-meeting-tab synchroon blijven.
 * Admin-only.
 */
export async function confirmThemeProposalAction(
  input: ConfirmThemeProposalInput,
): Promise<{ success: true } | { error: string }> {
  const parsed = confirmThemeProposalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const result = await updateThemeMutation(parsed.data.themeId, {
    status: "verified",
    verified_at: new Date().toISOString(),
    verified_by: guard.user.id,
  });
  if ("error" in result) return { error: result.error };

  revalidatePath("/review");
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/themes");
  revalidatePath("/");
  return { success: true };
}

/**
 * TH-011 (FUNC-280) — Reject een voorgesteld thema vanuit de in-meeting
 * tab. Set `status='archived'` (soft) en verwijder de `meeting_themes` link
 * zodat de proposal niet meer meetelt in pills/donut. Admin-only.
 * `theme_match_rejections` wordt bewust NIET gevuld — die feedback-loop is
 * voor eerdere Detector-matches tegen verified themes, niet voor afgewezen
 * proposals die het emerging-stadium nooit verlieten.
 */
export async function rejectThemeProposalAction(
  input: RejectThemeProposalInput,
): Promise<{ success: true } | { error: string }> {
  const parsed = rejectThemeProposalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const archiveRes = await archiveThemeMutation(parsed.data.themeId);
  if ("error" in archiveRes) return { error: archiveRes.error };

  // De meeting_themes-link verwijderen zodat de afgewezen proposal niet
  // langer in pills/donut meetelt. clearMeetingThemes schrapt alle links
  // voor de meeting, wat te ruim is; we doen een targeted delete via
  // rejectThemeMatchAsAdmin — dat is dezelfde cascade die TH-006 gebruikt
  // en zet ook de extraction_themes junction leeg voor (meeting, theme).
  const matchRes = await rejectThemeMatchAsAdmin({
    meetingId: parsed.data.meetingId,
    themeId: parsed.data.themeId,
    reason: "ander_thema",
    userId: guard.user.id,
  });
  if ("error" in matchRes) return { error: matchRes.error };

  await recalculateThemeStats([parsed.data.themeId]);

  revalidatePath("/review");
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/themes");
  revalidatePath("/");
  return { success: true };
}
