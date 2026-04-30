/**
 * Publieke deur voor het projects-domein. Consumers importeren via
 * `@repo/database/queries/projects` en krijgen alles uit core, detail,
 * lookup, context, embedding, access en reviews. Fine-grained imports
 * via `@repo/database/queries/projects/<file>`.
 */

export * from "./core";
export * from "./detail";
export * from "./lookup";
export * from "./context";
export * from "./embedding";
export * from "./access";
export * from "./reviews";
