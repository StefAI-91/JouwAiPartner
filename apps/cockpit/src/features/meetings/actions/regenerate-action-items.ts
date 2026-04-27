"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMeetingForRegenerateRisks } from "@repo/database/queries/meetings";
import { getAllKnownPeople } from "@repo/database/queries/people";
import {
  runActionItemSpecialistStep,
  buildActionItemParticipants,
} from "@repo/ai/pipeline/steps/action-item-specialist";
import { regenerateSchema } from "@repo/database/validations/meetings";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

/**
 * Lichte regenerate die alleen de Action Item Specialist opnieuw draait en
 * de action_items in `extractions` vervangt (alleen rijen met
 * `metadata.source = 'action_item_specialist'` die nog niet verified zijn).
 * Summary, risks, segments en project-koppelingen blijven ongemoeid.
 *
 * Hergebruikt `getMeetingForRegenerateRisks` qua shape (transcript-varianten
 * + raw_fireflies + participants) — alle data die nodig is voor zowel risks-
 * als action-item-regen is identiek.
 *
 * **Transcript-keuze.** Bewust Fireflies-first (`meeting.transcript`),
 * NIET named-first zoals risks. Reden: action-item-specialist matcht op
 * letterlijke source_quote; named-transcript heeft drift uit speaker-
 * mapping. Zie sprint 041 + docs/stand-van-zaken.md regels 95+159+165.
 */
export async function regenerateActionItemsAction(
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

  // FIREFLIES-FIRST. Fallback naar elevenlabs als Fireflies-tekst ontbreekt;
  // dan accepteren we de drift om überhaupt action_items te krijgen.
  const transcript =
    meeting.transcript || meeting.transcript_elevenlabs_named || meeting.transcript_elevenlabs;
  if (!transcript) {
    return { error: "Geen transcript beschikbaar voor deze meeting" };
  }

  const participantNames = meeting.meeting_participants.map((mp) => mp.person.name);

  // Identified_projects uit raw_fireflies hergebruiken zodat de project-
  // mapping consistent blijft met de originele pipeline-run (geen tweede
  // Gatekeeper-call). Identiek aan regenerateRisksAction.
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
    const knownPeople = await getAllKnownPeople();
    const richParticipants = buildActionItemParticipants(participantNames, knownPeople);

    await runActionItemSpecialistStep(
      meetingId,
      transcript,
      {
        title: meeting.title || "Onbekend",
        meeting_type: meeting.meeting_type || "other",
        party_type: meeting.party_type || "other",
        meeting_date: meeting.date || new Date().toISOString().split("T")[0],
        participants: richParticipants,
      },
      identifiedProjects,
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { error: `Action items regenereren mislukt: ${errMsg}` };
  }

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/review/${meetingId}`);
  revalidatePath("/review");
  return { success: true };
}
