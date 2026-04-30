/**
 * Widget-domein constants. Eén centrale plek zodat tweaken een one-line-
 * edit + redeploy is — geen jacht op magic numbers door route + util heen.
 */

/**
 * Maximum aantal POST'en naar `/api/ingest/widget` per Origin per uur. V0-
 * gok (WG-005 §Q2): meten in eerste maand na klant-rollout (WG-004) en
 * verhogen als 30 te krap blijkt.
 */
export const WIDGET_RATE_LIMIT_PER_HOUR = 30;

/**
 * Prefix in de `widget_rate_limits.key`-kolom zodat we — als er ooit een
 * tweede route met rate-limit komt — de counters niet door elkaar halen.
 * Voor nu één route → één prefix; dat is genoeg.
 */
export const WIDGET_RATE_LIMIT_KEY_PREFIX = "widget_ingest";
