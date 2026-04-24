/**
 * Publieke deur voor het meetings-domein. Consumers importeren via
 * `@repo/database/queries/meetings` en krijgen alles uit core,
 * project-summaries en themes (meeting_themes junction).
 *
 * Fine-grained imports ook mogelijk, bv.:
 *   `@repo/database/queries/meetings/project-summaries`
 *   `@repo/database/queries/meetings/themes`
 */

export * from "./core";
export * from "./project-summaries";
export * from "./themes";
