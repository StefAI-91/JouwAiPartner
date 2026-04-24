/**
 * Publieke deur voor email-pipeline. Via `export *` zijn core +
 * filter-gatekeeper + pre-classifier bereikbaar op
 * `@repo/ai/pipeline/email`.
 */

export * from "./core";
export * from "./filter-gatekeeper";
export * from "./pre-classifier";
