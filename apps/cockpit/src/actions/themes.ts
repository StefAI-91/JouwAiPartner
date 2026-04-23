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
  rejectThemeMatchAsAdmin,
  recalculateThemeStats,
} from "@repo/database/mutations/meeting-themes";
import { runThemeDetectorStep } from "@repo/ai/pipeline/steps/theme-detector";
import { runLinkThemesStep } from "@repo/ai/pipeline/steps/link-themes";
import { getVerifiedMeetingById } from "@repo/database/queries/meetings";
import {
  updateThemeSchema,
  archiveThemeSchema,
  approveThemeSchema,
  rejectEmergingThemeSchema,
  rejectThemeMatchSchema,
  regenerateMeetingThemesSchema,
  createVerifiedThemeSchema,
  type UpdateThemeInput,
  type ArchiveThemeInput,
  type ApproveThemeInput,
  type RejectEmergingThemeInput,
  type RejectThemeMatchInput,
  type RegenerateMeetingThemesInput,
  type CreateVerifiedThemeInput,
} from "@/validations/themes";

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
 * TH-011 (FUNC-283) — Regenerate thema-links voor één meeting.
 *
 * Vernieuwt de Theme-Detector output op basis van de huidige
 * meeting-summary, en laat `link-themes` met `replace: true` de bestaande
 * `meeting_themes` + `extraction_themes` vervangen door de verse match-set.
 * `theme_match_rejections` blijft ongemoeid — de volgende detector-run
 * respecteert 'm vanzelf via de FUNC-274 filter.
 *
 * Bewust géén re-run van de Summarizer: op een verified meeting kan de
 * reviewer summary/extraction-edits hebben gemaakt; die overschrijven we
 * niet. Consequentie: extractions zonder `[Themes:]` annotatie vallen
 * terug op de substring-fallback in `link-themes`. Acceptabel voor V1
 * (zie TH-011 sprint "Annotation-only regenerate" in Out of scope).
 *
 * Revalidate paths: dashboard home, meeting detail, en — als de meeting
 * nog in review staat — de review-pagina zodat het proposal-tabblad
 * meteen bijgewerkt is.
 */
export async function regenerateMeetingThemesAction(
  input: RegenerateMeetingThemesInput,
): Promise<{ success: true; matches: number; proposals: number } | { error: string }> {
  const parsed = regenerateMeetingThemesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const meeting = await getVerifiedMeetingById(parsed.data.meetingId);
  if (!meeting) return { error: "Meeting niet gevonden of niet verified" };

  const detector = await runThemeDetectorStep({
    meeting: {
      meetingId: parsed.data.meetingId,
      title: meeting.title ?? "",
      meeting_type: meeting.meeting_type ?? "team_sync",
      party_type: meeting.party_type ?? "internal",
      participants: meeting.meeting_participants.map((mp) => mp.person.name),
      summary: meeting.summary ?? "",
      // Bij regenerate is de Gatekeeper-output niet meer in memory. De
      // Detector werkt op de summary zelf; project-context missen heeft
      // beperkte impact omdat de matching_guide de arbiter is.
      identifiedProjects: [],
    },
  });
  if (detector.error) return { error: `ThemeDetector: ${detector.error}` };

  const result = await runLinkThemesStep({
    meetingId: parsed.data.meetingId,
    detectorOutput: detector.output,
    replace: true,
  });
  if (result.error) return { error: result.error };

  revalidatePath("/");
  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/review");
  revalidatePath("/themes");
  return {
    success: true,
    matches: result.matches_saved,
    proposals: result.proposals_saved,
  };
}

/**
 * TH-010 — Admin-create een nieuw verified thema direct vanuit `/dev/tagger`.
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
