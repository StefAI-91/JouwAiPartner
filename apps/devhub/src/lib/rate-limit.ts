import { incrementRateLimit } from "@repo/database/mutations/widget";
import {
  WIDGET_RATE_LIMIT_KEY_PREFIX,
  WIDGET_RATE_LIMIT_PER_HOUR,
} from "@repo/database/constants/widget";

export interface RateLimitResult {
  /** False = over de limiet (route hoort 429 terug te geven). */
  success: boolean;
  /** Nieuwe count voor logging. -1 = fail-open (DB faalde). */
  count: number;
  /** Limit zoals toegepast — zodat de route 'm in headers/log kan zetten. */
  limit: number;
}

/**
 * Rate-limit één request op `(prefix, origin)`. Atomic increment via een
 * Postgres-RPC, zodat concurrente requests niet langs elkaar heen kunnen
 * tellen.
 *
 * **Fail-open** (WG-REQ-096): als de DB-call faalt, return success.
 * Argumentatie: 30 minuten extra spam in triage is hersteldbaar; alle
 * feedback per ongeluk weggooien is dat niet. Documentatie-trail in
 * `docs/security/audit-report.md`.
 */
export async function rateLimitOrigin(origin: string): Promise<RateLimitResult> {
  const key = `${WIDGET_RATE_LIMIT_KEY_PREFIX}:${origin}`;
  try {
    const count = await incrementRateLimit(key);
    return {
      success: count <= WIDGET_RATE_LIMIT_PER_HOUR,
      count,
      limit: WIDGET_RATE_LIMIT_PER_HOUR,
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        type: "rate_limit_failed",
        key,
        error: error instanceof Error ? error.message : String(error),
        ts: new Date().toISOString(),
      }),
    );
    return { success: true, count: -1, limit: WIDGET_RATE_LIMIT_PER_HOUR };
  }
}
