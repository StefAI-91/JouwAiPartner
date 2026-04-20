/**
 * Anthropic pricing per million tokens (USD). Bijgewerkt per model-release.
 * Bron: https://www.anthropic.com/pricing — alleen de modellen die we
 * daadwerkelijk gebruiken.
 *
 * cachedInput = tarief voor prompt-caching read hits (90% korting t.o.v.
 * normale input). We loggen cached_tokens apart in agent_runs zodat we
 * een eerlijke kostenberekening kunnen doen: non-cached * input + cached *
 * cachedInput + output * output.
 */
export interface ModelPricing {
  input: number;
  cachedInput: number;
  output: number;
}

const PRICING: Record<string, ModelPricing> = {
  "claude-haiku-4-5-20251001": { input: 1.0, cachedInput: 0.1, output: 5.0 },
  "claude-sonnet-4-5-20250929": { input: 3.0, cachedInput: 0.3, output: 15.0 },
  "claude-sonnet-4-6": { input: 3.0, cachedInput: 0.3, output: 15.0 },
  "claude-opus-4-7": { input: 15.0, cachedInput: 1.5, output: 75.0 },
};

/**
 * Compute USD cost for a single run. Returns 0 if model is unknown or
 * no tokens were used.
 */
export function estimateRunCostUsd(
  model: string,
  tokens: {
    input?: number | null;
    output?: number | null;
    cached?: number | null;
  },
): number {
  const price = PRICING[model];
  if (!price) return 0;

  const cached = tokens.cached ?? 0;
  const regularInput = Math.max(0, (tokens.input ?? 0) - cached);
  const output = tokens.output ?? 0;

  return (
    (regularInput / 1_000_000) * price.input +
    (cached / 1_000_000) * price.cachedInput +
    (output / 1_000_000) * price.output
  );
}
