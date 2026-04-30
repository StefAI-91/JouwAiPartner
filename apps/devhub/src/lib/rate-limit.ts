import { incrementRateLimit } from "@repo/database/mutations/widget";
import {
  WIDGET_RATE_LIMIT_KEY_PREFIX,
  WIDGET_RATE_LIMIT_PER_HOUR,
  WIDGET_SCREENSHOT_LIMIT_PER_HOUR,
  WIDGET_SCREENSHOT_RATE_LIMIT_KEY_PREFIX,
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
 * Welke counter wordt aangeroepen. Elke scope krijgt een eigen prefix in
 * `widget_rate_limits.key` zodat counters voor verschillende routes niet
 * door elkaar lopen.
 */
export type RateLimitScope = "widget_ingest" | "screenshot_ingest";

const SCOPES: Record<RateLimitScope, { prefix: string; limit: number }> = {
  widget_ingest: {
    prefix: WIDGET_RATE_LIMIT_KEY_PREFIX,
    limit: WIDGET_RATE_LIMIT_PER_HOUR,
  },
  screenshot_ingest: {
    prefix: WIDGET_SCREENSHOT_RATE_LIMIT_KEY_PREFIX,
    limit: WIDGET_SCREENSHOT_LIMIT_PER_HOUR,
  },
};

/**
 * Rate-limit één request op `(scope, origin)`. Atomic increment via een
 * Postgres-RPC, zodat concurrente requests niet langs elkaar heen kunnen
 * tellen.
 *
 * **Fail-open** (WG-REQ-096): als de DB-call faalt, return success.
 * Argumentatie: 30 minuten extra spam in triage is hersteldbaar; alle
 * feedback per ongeluk weggooien is dat niet. Documentatie-trail in
 * `docs/security/audit-report.md`.
 */
export async function rateLimitOrigin(
  origin: string,
  scope: RateLimitScope = "widget_ingest",
): Promise<RateLimitResult> {
  const { prefix, limit } = SCOPES[scope];
  const key = `${prefix}:${origin}`;
  try {
    const count = await incrementRateLimit(key);
    return {
      success: count <= limit,
      count,
      limit,
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
    return { success: true, count: -1, limit };
  }
}
