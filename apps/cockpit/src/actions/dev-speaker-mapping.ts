"use server";

import { z } from "zod";
import { requireAdminInAction } from "@repo/auth/access";
import { getMeetingForGoldenCoder } from "@repo/database/queries/golden";
import { listMeetingsWithTranscript } from "@repo/database/queries/meetings/pipeline-fetches";
import {
  countSpeakerMappingBackfillRemaining,
  getSpeakerMappingTranscriptCounts,
  listSpeakerMappingBackfillCandidates,
} from "@repo/database/queries/meetings/speaker-mapping";
import {
  runSpeakerIdentifier,
  getSpeakerIdentifierPrompt,
  type SpeakerIdentifierResult,
} from "@repo/ai/agents/speaker-identifier";
import { runSpeakerMappingStep } from "@repo/ai/pipeline/steps/speaker-mapping";

/**
 * Server action voor de speaker-mapping test-pagina.
 *
 * Doel: voor één geselecteerde meeting zien of Haiku speaker_X-labels uit het
 * ElevenLabs-transcript correct kan mappen aan de DB-deelnemers. Geen DB-writes —
 * pure dry-run om de aanpak te valideren voordat we 'm in de pipeline bakken.
 */

const runSchema = z.object({
  meetingId: z.string().uuid(),
  perSpeaker: z.number().int().min(1).max(20).default(10),
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
    transcript_source: "elevenlabs_named" | "elevenlabs" | "fireflies" | null;
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
  if (!meeting.transcript_elevenlabs) {
    return {
      error:
        "Geen raw ElevenLabs-transcript beschikbaar — speaker-identifier vereist `transcript_elevenlabs` (de raw versie met `[speaker_X]`-labels). Deze meeting heeft alleen Fireflies-text.",
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

// ============================================================================
// BACKFILL — bulk-mappping van bestaande meetings vanuit de UI
// ============================================================================

export interface BackfillStatus {
  with_elevenlabs: number;
  with_named: number;
  without_named: number;
}

export async function getSpeakerMappingBackfillStatus(): Promise<
  BackfillStatus | { error: string }
> {
  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const counts = await getSpeakerMappingTranscriptCounts();
  if ("error" in counts) return { error: counts.error };
  return {
    with_elevenlabs: counts.with_elevenlabs,
    with_named: counts.with_named,
    without_named: Math.max(0, counts.with_elevenlabs - counts.with_named),
  };
}

const backfillBatchSchema = z.object({
  limit: z.number().int().min(1).max(20).default(5),
  force: z.boolean().default(false),
});

export type RunBackfillBatchInput = z.input<typeof backfillBatchSchema>;

export interface BackfillBatchItem {
  meeting_id: string;
  title: string | null;
  date: string | null;
  status: "mapped_full" | "mapped_partial" | "no_speakers" | "error";
  speaker_count: number;
  mapped_count: number;
  message: string | null;
}

export interface RunBackfillBatchResult {
  processed: number;
  remaining: number;
  items: BackfillBatchItem[];
}

export async function runSpeakerMappingBackfillBatch(
  input: RunBackfillBatchInput,
): Promise<RunBackfillBatchResult | { error: string }> {
  const parsed = backfillBatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const candidates = await listSpeakerMappingBackfillCandidates(
    parsed.data.limit,
    parsed.data.force,
  );
  if (candidates.length === 0) {
    return { processed: 0, remaining: 0, items: [] };
  }

  const items: BackfillBatchItem[] = [];
  for (const meeting of candidates) {
    const result = await runSpeakerMappingStep({
      meetingId: meeting.id,
      elevenLabsTranscript: meeting.transcript_elevenlabs,
      firefliesTranscript: meeting.transcript_fireflies,
    });

    let status: BackfillBatchItem["status"];
    let message: string | null = null;
    if (result.error) {
      status = "error";
      message = result.error;
    } else if (result.speaker_count === 0) {
      status = "no_speakers";
      message = "Geen `[speaker_X]`-labels in transcript gevonden.";
    } else if (result.mapped_count === result.speaker_count) {
      status = "mapped_full";
    } else {
      status = "mapped_partial";
      message = `${result.speaker_count - result.mapped_count} speaker(s) bleven anoniem.`;
    }

    items.push({
      meeting_id: meeting.id,
      title: meeting.title,
      date: meeting.date,
      status,
      speaker_count: result.speaker_count,
      mapped_count: result.mapped_count,
      message,
    });
  }

  // Resterende meetings na deze batch (gebruik dezelfde filter — anders krijg
  // je een misleidend hoge "remaining" wanneer force=true).
  const remainingResult = await countSpeakerMappingBackfillRemaining(parsed.data.force);
  const remaining = typeof remainingResult === "number" ? remainingResult : 0;

  return { processed: items.length, remaining, items };
}
