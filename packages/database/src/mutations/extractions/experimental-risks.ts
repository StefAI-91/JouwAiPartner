import { getAdminClient } from "../../supabase/admin";

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
 * Append-only run-telemetrie voor de RiskSpecialist: latency, token-counts,
 * model, prompt_version, eventuele error. Ooit bedoeld als A/B-tabel naast
 * de MeetingStructurer; sinds de RiskSpecialist productie is (zie
 * `runRiskSpecialistStep`) dient het als audit-laag voor cost-analyse,
 * prompt-drift en failure-tracking. Tabelnaam is bewust niet herdoopt —
 * migratie zou overhead zijn zonder functioneel winstpunt.
 *
 * Eén rij per (meeting, prompt_version, timestamp). Re-runs bij prompt-
 * change worden naast elkaar bewaard zodat diffs tussen versies mogelijk
 * blijven.
 *
 * Non-blocking qua pipeline: caller wrapt in try-catch zodat een
 * telemetry-save-fout de productie-save niet afbreekt.
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
