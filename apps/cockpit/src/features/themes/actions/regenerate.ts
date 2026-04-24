"use server";

import { revalidatePath } from "next/cache";
import { requireAdminInAction } from "@repo/auth/access";
import { runThemeDetectorStep } from "@repo/ai/pipeline/steps/theme-detector";
import { runLinkThemesStep } from "@repo/ai/pipeline/steps/link-themes";
import { getVerifiedMeetingById } from "@repo/database/queries/meetings";
import { regenerateMeetingThemesSchema, type RegenerateMeetingThemesInput } from "../validations";

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
