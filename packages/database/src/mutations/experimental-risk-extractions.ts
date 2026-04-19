import { getAdminClient } from "../supabase/admin";

export interface ExperimentalRiskExtractionInput {
  meeting_id: string;
  model: string;
  prompt_version: string;
  /** Array van risk-items (zie RiskSpecialistItem in @repo/ai). Als agent faalde: [] */
  risks: unknown[];
  latency_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  reasoning_tokens?: number | null;
  error?: string | null;
}

/**
 * Persist één RiskSpecialist-run naast de MeetingStructurer-output. Eén
 * rij per (meeting, prompt_version, timestamp) — re-runs bij prompt-change
 * worden naast elkaar bewaard zodat A/B-diffs mogelijk blijven.
 *
 * Non-blocking qua pipeline: caller wrapt in try-catch zodat een
 * experiment-save-fout de hoofdpipeline niet afbreekt.
 */
export async function insertExperimentalRiskExtraction(
  input: ExperimentalRiskExtractionInput,
): Promise<{ success: true; id: string } | { error: string }> {
  const { data, error } = await getAdminClient()
    .from("experimental_risk_extractions")
    .insert({
      meeting_id: input.meeting_id,
      model: input.model,
      prompt_version: input.prompt_version,
      risks: input.risks,
      latency_ms: input.latency_ms ?? null,
      input_tokens: input.input_tokens ?? null,
      output_tokens: input.output_tokens ?? null,
      reasoning_tokens: input.reasoning_tokens ?? null,
      error: input.error ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, id: data.id };
}
