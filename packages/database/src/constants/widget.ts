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
 */
export const WIDGET_RATE_LIMIT_KEY_PREFIX = "widget_ingest";

/**
 * Max aantal screenshot-uploads naar `/api/ingest/widget/screenshot` per
 * Origin per uur. Bewust lager dan de feedback-limit (WG-006a §Q4): één
 * upload is duurder (PNG-bytes + storage-write) en een screenshot zonder
 * bijbehorende feedback heeft geen waarde, dus 10/uur is genoeg.
 */
export const WIDGET_SCREENSHOT_LIMIT_PER_HOUR = 10;

/**
 * Eigen prefix voor de screenshot-counter zodat screenshots geen feedback-
 * budget eten. `widget_ingest:foo.com` en `screenshot_ingest:foo.com`
 * staan los in dezelfde `widget_rate_limits`-tabel.
 */
export const WIDGET_SCREENSHOT_RATE_LIMIT_KEY_PREFIX = "screenshot_ingest";

/**
 * Max raw bytes voor één screenshot upload (pre-compressie). 1920×1080 PNG
 * komt op 0.5–1.5 MB; 2 MB geeft buffer voor retina/4K zonder dat één
 * upload de pipe verzadigt.
 */
export const WIDGET_SCREENSHOT_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Toegestane mime-types voor screenshot-upload. V0 = alleen PNG omdat
 * `html2canvas` standaard PNG levert. JPEG/WebP later.
 */
export const WIDGET_SCREENSHOT_ALLOWED_MIMES = ["image/png"] as const;

/**
 * TTL voor een ge-uploade-maar-nog-niet-geclaimde screenshot-token. De
 * `expires_at`-default in de DB-migratie is hardcoded op
 * `now() + interval '1 hour'` — pas die aan als deze constante verandert.
 */
export const WIDGET_SCREENSHOT_TOKEN_TTL_MS = 60 * 60 * 1000;
