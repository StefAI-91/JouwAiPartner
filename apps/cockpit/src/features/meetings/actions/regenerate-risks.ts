"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMeetingForRegenerateRisks } from "@repo/database/queries/meetings";
import { runRiskSpecialistStep } from "@repo/ai/pipeline/steps/risk-specialist";
import { buildEntityContext } from "@repo/ai/pipeline/context-injection";
import { regenerateSchema } from "@repo/database/validations/meetings";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

/**
 * Lichte regenerate die alleen de RiskSpecialist opnieuw draait en de
 * risks in `extractions` vervangt. Summary, action_items, segments en
 * project-koppelingen blijven ongemoeid.
 *
 * Gebruikt de eerder door de Gatekeeper geïdentificeerde projecten uit
 * `raw_fireflies.pipeline.gatekeeper.identified_projects` zodat project_id-
 * mapping exact hetzelfde blijft als bij de originele run — geen tweede
 * Gatekeeper-call nodig.
 */
export async function regenerateRisksAction(
  input: z.infer<typeof regenerateSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const { meetingId } = parsed.data;

  const meeting = await getMeetingForRegenerateRisks(meetingId);
  if (!meeting) {
    return { error: "Meeting niet gevonden" };
  }

  const transcript =
    meeting.transcript_elevenlabs_named || meeting.transcript_elevenlabs || meeting.transcript;
  if (!transcript) {
    return { error: "Geen transcript beschikbaar voor deze meeting" };
  }

  const participants = meeting.meeting_participants.map((mp) => mp.person.name);

  // Haal identified_projects uit raw_fireflies zodat we exact dezelfde
  // project-mapping gebruiken als de originele pipeline. Bij legacy
  // meetings waar die kolom nog leeg is vallen we terug op een lege lijst
  // — RiskSpecialist schrijft dan risks met project_id=null, wat acceptabel
  // is (beter dan falen).
  type RawProject = { project_name?: unknown; project_id?: unknown; confidence?: unknown };
  const rawFf = meeting.raw_fireflies as Record<string, unknown> | null;
  const pipeline = rawFf?.pipeline as Record<string, unknown> | undefined;
  const gkData = pipeline?.gatekeeper as Record<string, unknown> | undefined;
  const rawProjects = Array.isArray(gkData?.identified_projects)
    ? (gkData.identified_projects as RawProject[])
    : [];
  const identifiedProjects = rawProjects
    .filter((p): p is RawProject & { project_name: string } => typeof p.project_name === "string")
    .map((p) => ({
      project_name: p.project_name,
      project_id: typeof p.project_id === "string" ? p.project_id : null,
      confidence: typeof p.confidence === "number" ? p.confidence : 0.5,
    }));

  try {
    const entityContext = await buildEntityContext();

    await runRiskSpecialistStep(
      meetingId,
      transcript,
      {
        title: meeting.title || "Onbekend",
        meeting_type: meeting.meeting_type || "other",
        party_type: meeting.party_type || "other",
        participants,
        speakerContext: null,
        entityContext: entityContext.contextString,
        meeting_date: meeting.date || new Date().toISOString().split("T")[0],
        identified_projects: identifiedProjects.map((p) => ({
          project_name: p.project_name,
          project_id: p.project_id,
        })),
      },
      identifiedProjects,
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { error: `Risks regenereren mislukt: ${errMsg}` };
  }

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/review/${meetingId}`);
  revalidatePath("/review");
  return { success: true };
}
