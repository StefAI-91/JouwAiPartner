"use server";

import { z } from "zod";
import { requireAdminInAction } from "@repo/auth/access";
import { getAdminClient } from "@repo/database/supabase/admin";
import {
  runMeetingStructurer,
  MEETING_STRUCTURER_SYSTEM_PROMPT,
} from "@repo/ai/agents/meeting-structurer";
import {
  runRiskSpecialist,
  RISK_SPECIALIST_SYSTEM_PROMPT,
  RISK_SPECIALIST_PROMPT_VERSION,
} from "@repo/ai/agents/risk-specialist";
import { ALL_EXTRACTION_TYPES } from "@repo/ai/extraction-types";
import type { Kernpunt } from "@repo/ai/validations/meeting-structurer";
import type {
  RiskSpecialistItem,
  RiskSpecialistOutput,
} from "@repo/ai/validations/risk-specialist";
import type { RiskSpecialistRunMetrics } from "@repo/ai/agents/risk-specialist";

const runDevExtractorSchema = z.object({
  meetingId: z.string().uuid(),
  type: z.enum(ALL_EXTRACTION_TYPES),
});

export interface DevExtractorResult {
  transcript: string;
  /** Current extractions in the DB for this meeting + type (type-filtered). */
  currentInDb: {
    id: string;
    content: string;
    confidence: number | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }[];
  /** Fresh kernpunten from a one-off MeetingStructurer run, filtered by type. */
  freshOutput: Kernpunt[];
  /** Unfiltered briefing from the fresh run — useful context for tuning. */
  freshBriefing: string;
  meeting: {
    id: string;
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    party_type: string | null;
  };
}

/**
 * Run the MeetingStructurer one-off on a meeting and return the output
 * filtered to the requested type alongside the current DB state. Never
 * writes to the database — this action is strictly a tuning tool for
 * the harness.
 *
 * Admin-only (SEC-P020 in the PW-02 spec).
 */
export async function runDevExtractorAction(
  input: z.infer<typeof runDevExtractorSchema>,
): Promise<DevExtractorResult | { error: string }> {
  const parsed = runDevExtractorSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return guard;

  const db = getAdminClient();

  const { data: meeting, error: meetingErr } = await db
    .from("meetings")
    .select(
      "id, title, date, meeting_type, party_type, transcript, transcript_elevenlabs, participants",
    )
    .eq("id", parsed.data.meetingId)
    .single();

  if (meetingErr || !meeting) return { error: "Meeting niet gevonden" };

  const transcript =
    (meeting.transcript_elevenlabs as string | null) ?? (meeting.transcript as string | null) ?? "";
  if (!transcript) return { error: "Geen transcript beschikbaar voor deze meeting" };

  // Fetch current DB state for this type only — the UI shows a side-by-side
  // diff, so we only need the filtered slice.
  const { data: currentRows } = await db
    .from("extractions")
    .select("id, content, confidence, metadata, created_at")
    .eq("meeting_id", parsed.data.meetingId)
    .eq("type", parsed.data.type)
    .order("created_at", { ascending: false });

  try {
    const output = await runMeetingStructurer(transcript, {
      title: (meeting.title as string | null) ?? "",
      meeting_type: (meeting.meeting_type as string | null) ?? "unknown",
      party_type: (meeting.party_type as string | null) ?? "unknown",
      meeting_date: (meeting.date as string | null) ?? new Date().toISOString().slice(0, 10),
      participants: ((meeting.participants as string[] | null) ?? []) as string[],
    });

    const freshOutput = output.kernpunten.filter((k) => k.type === parsed.data.type);

    return {
      transcript,
      currentInDb: (currentRows ?? []) as DevExtractorResult["currentInDb"],
      freshOutput,
      freshBriefing: output.briefing,
      meeting: {
        id: meeting.id as string,
        title: (meeting.title as string | null) ?? null,
        date: (meeting.date as string | null) ?? null,
        meeting_type: (meeting.meeting_type as string | null) ?? null,
        party_type: (meeting.party_type as string | null) ?? null,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `MeetingStructurer faalde: ${msg}` };
  }
}

/**
 * Exposed for the harness UI: read-only access to the system prompt so
 * Stef kan zien welke instructies de agent nu krijgt zonder src-files open.
 */
export async function getMeetingStructurerPromptAction(): Promise<
  { prompt: string } | { error: string }
> {
  const guard = await requireAdminInAction();
  if ("error" in guard) return guard;
  return { prompt: MEETING_STRUCTURER_SYSTEM_PROMPT };
}

const runRiskSpecialistSchema = z.object({
  meetingId: z.string().uuid(),
});

export interface DevRiskSpecialistResult {
  /** Het transcript dat aan de agent is gevoed (voor side-by-side UI). */
  transcript: string;
  /** Huidige MeetingStructurer-risks die al in DB staan (voor vergelijking). */
  currentInDb: {
    id: string;
    content: string;
    confidence: number | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }[];
  /** Verse RiskSpecialist-output uit Haiku 4.5. */
  freshRisks: RiskSpecialistItem[];
  /** Run-metrics voor A/B-vergelijking. */
  metrics: RiskSpecialistRunMetrics;
  /** Prompt-versie die deze run heeft gemaakt. */
  promptVersion: string;
  meeting: {
    id: string;
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    party_type: string | null;
  };
}

/**
 * Draai de RiskSpecialist one-off op een meeting en vergelijk met de
 * bestaande MeetingStructurer-risks in DB. Geen DB-writes — puur een
 * tuning-tool naast de automatische experiment-step die bij elke ingest
 * wel persisteert.
 *
 * Admin-only.
 */
export async function runDevRiskSpecialistAction(
  input: z.infer<typeof runRiskSpecialistSchema>,
): Promise<DevRiskSpecialistResult | { error: string }> {
  const parsed = runRiskSpecialistSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return guard;

  const db = getAdminClient();

  const { data: meeting, error: meetingErr } = await db
    .from("meetings")
    .select(
      "id, title, date, meeting_type, party_type, transcript, transcript_elevenlabs, participants",
    )
    .eq("id", parsed.data.meetingId)
    .single();

  if (meetingErr || !meeting) return { error: "Meeting niet gevonden" };

  const transcript =
    (meeting.transcript_elevenlabs as string | null) ?? (meeting.transcript as string | null) ?? "";
  if (!transcript) return { error: "Geen transcript beschikbaar voor deze meeting" };

  const { data: currentRows } = await db
    .from("extractions")
    .select("id, content, confidence, metadata, created_at")
    .eq("meeting_id", parsed.data.meetingId)
    .eq("type", "risk")
    .order("created_at", { ascending: false });

  try {
    const { output, metrics } = await runRiskSpecialist(transcript, {
      title: (meeting.title as string | null) ?? "",
      meeting_type: (meeting.meeting_type as string | null) ?? "unknown",
      party_type: (meeting.party_type as string | null) ?? "unknown",
      meeting_date: (meeting.date as string | null) ?? new Date().toISOString().slice(0, 10),
      participants: ((meeting.participants as string[] | null) ?? []) as string[],
    });

    return {
      transcript,
      currentInDb: (currentRows ?? []) as DevRiskSpecialistResult["currentInDb"],
      freshRisks: (output as RiskSpecialistOutput).risks,
      metrics,
      promptVersion: RISK_SPECIALIST_PROMPT_VERSION,
      meeting: {
        id: meeting.id as string,
        title: (meeting.title as string | null) ?? null,
        date: (meeting.date as string | null) ?? null,
        meeting_type: (meeting.meeting_type as string | null) ?? null,
        party_type: (meeting.party_type as string | null) ?? null,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `RiskSpecialist faalde: ${msg}` };
  }
}

/**
 * Read-only access tot de RiskSpecialist system-prompt voor de harness.
 */
export async function getRiskSpecialistPromptAction(): Promise<
  { prompt: string } | { error: string }
> {
  const guard = await requireAdminInAction();
  if ("error" in guard) return guard;
  return { prompt: RISK_SPECIALIST_SYSTEM_PROMPT };
}
