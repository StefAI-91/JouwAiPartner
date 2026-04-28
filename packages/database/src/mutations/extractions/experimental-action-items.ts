import { getAdminClient } from "../../supabase/admin";

export interface ExperimentalActionItemExtractionInput {
  meeting_id: string;
  model: string;
  prompt_version: string;
  /** Modus van de specialist-run. Default 'single'. */
  mode?: string;
  /** Geaccepteerde items (na gate + validator) — zelfde set die naar
   *  `extractions` is geschreven. Bij agent-crash: []. */
  items: unknown[];
  /** Items die door de mechanische gate of de stage-3 validator vielen.
   *  Handig om te zien waarom de productie-output kleiner is dan wat het
   *  model wilde accepteren. Bij agent-crash: []. */
  gated?: unknown[];
  accept_count?: number;
  gate_count?: number;
  latency_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  reasoning_tokens?: number | null;
  error?: string | null;
}

/**
 * Append-only run-telemetrie voor de Action Item Specialist. Eén rij per
 * pipeline-run met model, prompt_version, mode, latency, token-counts,
 * accept/gate counts, eventuele error.
 *
 * Pattern is identiek aan `insertExperimentalRiskExtraction`. Zelfde
 * doel: cost-analyse, prompt-drift, failure-tracking zonder de productie-
 * `extractions`-tabel te vervuilen.
 *
 * Non-blocking qua pipeline: caller wrapt in try-catch zodat een
 * telemetry-save-fout de productie-save niet afbreekt.
 */
export async function insertExperimentalActionItemExtraction(
  input: ExperimentalActionItemExtractionInput,
): Promise<{ success: true; id: string } | { error: string }> {
  const { data, error } = await getAdminClient()
    .from("experimental_action_item_extractions")
    .insert({
      meeting_id: input.meeting_id,
      model: input.model,
      prompt_version: input.prompt_version,
      mode: input.mode ?? "single",
      items: input.items,
      gated: input.gated ?? [],
      accept_count: input.accept_count ?? input.items.length,
      gate_count: input.gate_count ?? input.gated?.length ?? 0,
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
