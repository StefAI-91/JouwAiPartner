/**
 * Publieke deur voor summaries-mutations. Via `export *` zijn core +
 * management-insights beide bereikbaar op `@repo/database/mutations/
 * summaries`. Fine-grained import via `.../summaries/management-insights`.
 */

export * from "./core";
export * from "./management-insights";
