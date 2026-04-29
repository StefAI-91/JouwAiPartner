/**
 * Widget-domein constants. Eén centrale plek zodat tweaken een one-line-
 * edit + redeploy is — geen jacht op magic numbers door route + util heen.
 */

/**
 * Maximum aantal POST'en naar de ingest-routes per Origin per uur. V0-gok
 * (WG-005 §Q2): meten in eerste maand na klant-rollout (WG-004) en
 * verhogen als 30 te krap blijkt.
 */
export const WIDGET_RATE_LIMIT_PER_HOUR = 30;

/**
 * Prefixes per route zodat dezelfde widget_rate_limits-tabel meerdere
 * counters kan dragen zonder ze door elkaar te halen.
 */
export const WIDGET_RATE_LIMIT_PREFIXES = {
  widget_ingest: "widget_ingest",
  userback_ingest: "userback_ingest",
} as const;

export type WidgetRateLimitPrefix =
  (typeof WIDGET_RATE_LIMIT_PREFIXES)[keyof typeof WIDGET_RATE_LIMIT_PREFIXES];
