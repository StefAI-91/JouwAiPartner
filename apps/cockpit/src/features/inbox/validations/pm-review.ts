/**
 * Re-export van het canonieke schema uit `@repo/database/validations/issues`.
 * Lokale re-export zodat feature-componenten en client-side gebruik niet de
 * hele package-validations-import nodig hebben.
 */
export { pmReviewActionSchema, type PmReviewAction } from "@repo/database/validations/issues";
