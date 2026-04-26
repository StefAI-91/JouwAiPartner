"use server";

import { z } from "zod";
import { requireAdminInAction } from "@repo/auth/access";
import { getMeetingForGoldenCoder } from "@repo/database/queries/golden";
import { listMeetingsWithTranscript } from "@repo/database/queries/meetings/core";
import {
  runSpeakerIdentifier,
  getSpeakerIdentifierPrompt,
  type SpeakerIdentifierResult,
} from "@repo/ai/agents/speaker-identifier";

/**
 * Server action voor de speaker-mapping test-pagina.
 *
 * Doel: voor één geselecteerde meeting zien of Haiku speaker_X-labels uit het
 * ElevenLabs-transcript correct kan mappen aan de DB-deelnemers. Geen DB-writes —
 * pure dry-run om de aanpak te valideren voordat we 'm in de pipeline bakken.
 */

const runSchema = z.object({
  meetingId: z.string().uuid(),
  perSpeaker: z.number().int().min(1).max(20).default(6),
});

export type RunSpeakerMappingInput = z.input<typeof runSchema>;

export interface SpeakerMappingMeetingOption {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
}

export interface RunSpeakerMappingResult {
  meetingContext: {
    id: string;
    title: string;
    date: string | null;
    transcript_length: number;
    transcript_source: "elevenlabs" | "fireflies" | null;
    participants: {
      name: string;
      role: string | null;
      organization: string | null;
      organization_type: string | null;
    }[];
  };
  mapping: SpeakerIdentifierResult["mapping"];
  debug: SpeakerIdentifierResult["debug"];
  metrics: SpeakerIdentifierResult["metrics"];
  systemPrompt: string;
}

export async function listSpeakerMappingMeetings(): Promise<SpeakerMappingMeetingOption[]> {
  const guard = await requireAdminInAction();
  if ("error" in guard) return [];
  const list = await listMeetingsWithTranscript(60);
  return list;
}

export async function runSpeakerMappingAction(
  input: RunSpeakerMappingInput,
): Promise<RunSpeakerMappingResult | { error: string }> {
  const parsed = runSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const meeting = await getMeetingForGoldenCoder(parsed.data.meetingId);
  if (!meeting) return { error: "Meeting niet gevonden" };
  if (!meeting.transcript) return { error: "Meeting heeft geen transcript" };
  if (meeting.transcript_source !== "elevenlabs") {
    return {
      error:
        "Geen ElevenLabs-transcript beschikbaar — speaker-identifier vereist `transcript_elevenlabs`. Deze meeting heeft alleen Fireflies-text.",
    };
  }

  const participants = meeting.participants.map((p) => ({
    name: p.name,
    role: p.role,
    organization: p.organization,
    organization_type: p.organization_type,
  }));

  try {
    const result = await runSpeakerIdentifier({
      transcript: meeting.transcript_elevenlabs ?? meeting.transcript,
      firefliesTranscript: meeting.transcript_fireflies,
      participants,
      perSpeaker: parsed.data.perSpeaker,
    });

    return {
      meetingContext: {
        id: meeting.id,
        title: meeting.title,
        date: meeting.date,
        transcript_length: meeting.transcript.length,
        transcript_source: meeting.transcript_source,
        participants,
      },
      mapping: result.mapping,
      debug: result.debug,
      metrics: result.metrics,
      systemPrompt: getSpeakerIdentifierPrompt(),
    };
  } catch (err) {
    console.error("[dev-speaker-mapping] crashed", err);
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Agent crashte: ${msg}` };
  }
}
