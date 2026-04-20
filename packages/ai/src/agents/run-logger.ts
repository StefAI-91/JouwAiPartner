import { insertAgentRun, type AgentRunInput } from "@repo/database/mutations/agent-runs";

/**
 * Shape of the Vercel AI SDK `usage` object we care about. De SDK heeft
 * zowel een oude (deprecated) als nieuwe vorm voor reasoning- en cache-
 * tokens — we lezen beide met fallback zodat een SDK-bump ze niet stilletjes
 * op null zet. Nieuwe pad: outputTokenDetails / inputTokenDetails.
 * Oude pad: top-level reasoningTokens / cachedInputTokens (deprecated).
 */
export interface AgentUsage {
  inputTokens?: number | null;
  outputTokens?: number | null;
  /** @deprecated Use outputTokenDetails.reasoningTokens. Kept for backwards-compat. */
  reasoningTokens?: number | null;
  /** @deprecated Use inputTokenDetails.cacheReadTokens. Kept for backwards-compat. */
  cachedInputTokens?: number | null;
  outputTokenDetails?: {
    reasoningTokens?: number | null;
  };
  inputTokenDetails?: {
    cacheReadTokens?: number | null;
  };
}

export interface AgentRunLogContext {
  agent_name: string;
  model: string;
  prompt_version?: string | null;
  /** Agent-specifieke context: meeting_id, issue_id, etc. Landt in metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Wrap an agent's main `generateObject`/`generateText` call so every run is
 * logged to `agent_runs`, success or failure. The logging is fire-and-forget:
 * if the insert fails we swallow the error so the caller never sees a DB
 * write-fail masquerading as an agent failure.
 *
 * Usage:
 *
 *   return withAgentRun(
 *     { agent_name: "gatekeeper", model: "claude-haiku-4-5-20251001" },
 *     async () => {
 *       const { object, usage } = await generateObject({ ... });
 *       return { result: object, usage };
 *     },
 *   );
 *
 * The inner callback MUST return both the result and the usage stats so this
 * wrapper can capture token counts. If usage is unavailable, return it as
 * undefined.
 */
export async function withAgentRun<T>(
  ctx: AgentRunLogContext,
  fn: () => Promise<{ result: T; usage?: AgentUsage }>,
): Promise<T> {
  const startedAt = Date.now();

  try {
    const { result, usage } = await fn();

    void logRun({
      agent_name: ctx.agent_name,
      model: ctx.model,
      status: "success",
      latency_ms: Date.now() - startedAt,
      input_tokens: usage?.inputTokens ?? null,
      output_tokens: usage?.outputTokens ?? null,
      reasoning_tokens: extractReasoningTokens(usage),
      cached_tokens: extractCachedTokens(usage),
      prompt_version: ctx.prompt_version ?? null,
      metadata: ctx.metadata ?? {},
    });

    return result;
  } catch (err) {
    void logRun({
      agent_name: ctx.agent_name,
      model: ctx.model,
      status: "error",
      latency_ms: Date.now() - startedAt,
      error_message: err instanceof Error ? err.message : String(err),
      prompt_version: ctx.prompt_version ?? null,
      metadata: ctx.metadata ?? {},
    });

    throw err;
  }
}

function extractReasoningTokens(usage: AgentUsage | undefined): number | null {
  return usage?.outputTokenDetails?.reasoningTokens ?? usage?.reasoningTokens ?? null;
}

function extractCachedTokens(usage: AgentUsage | undefined): number | null {
  return usage?.inputTokenDetails?.cacheReadTokens ?? usage?.cachedInputTokens ?? null;
}

async function logRun(input: AgentRunInput): Promise<void> {
  try {
    const res = await insertAgentRun(input);
    if ("error" in res) {
      console.warn(`[agent-runs] insert failed for ${input.agent_name}:`, res.error);
    }
  } catch (err) {
    console.warn(`[agent-runs] logging threw for ${input.agent_name}:`, err);
  }
}
