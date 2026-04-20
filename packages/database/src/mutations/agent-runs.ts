import { getAdminClient } from "../supabase/admin";

export interface AgentRunInput {
  agent_name: string;
  model: string;
  status: "success" | "error";
  latency_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  reasoning_tokens?: number | null;
  cached_tokens?: number | null;
  prompt_version?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log a single agent run. Append-only — elke run is een nieuwe rij. Nooit
 * bestaande rijen updaten.
 *
 * Non-blocking by design: failures van deze insert mogen de hoofd-pipeline
 * niet breken. Callers moeten zelf try-catchen en de error zwijgend
 * loggen als de run zelf wel geslaagd is.
 */
export async function insertAgentRun(
  input: AgentRunInput,
): Promise<{ success: true; id: string } | { error: string }> {
  const { data, error } = await getAdminClient()
    .from("agent_runs")
    .insert({
      agent_name: input.agent_name,
      model: input.model,
      status: input.status,
      latency_ms: input.latency_ms ?? null,
      input_tokens: input.input_tokens ?? null,
      output_tokens: input.output_tokens ?? null,
      reasoning_tokens: input.reasoning_tokens ?? null,
      cached_tokens: input.cached_tokens ?? null,
      prompt_version: input.prompt_version ?? null,
      error_message: input.error_message ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, id: data.id };
}
