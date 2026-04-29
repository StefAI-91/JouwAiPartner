/**
 * Publieke deur voor het meetings-domein. Consumers importeren via
 * `@repo/database/queries/meetings` en krijgen alles uit core,
 * lookup, pipeline-fetches, regenerate, metadata, speaker-mapping,
 * project-summaries en themes (meeting_themes junction).
 *
 * Fine-grained imports ook mogelijk, bv.:
 *   `@repo/database/queries/meetings/lookup`
 *   `@repo/database/queries/meetings/pipeline-fetches`
 *   `@repo/database/queries/meetings/regenerate`
 *   `@repo/database/queries/meetings/metadata`
 *   `@repo/database/queries/meetings/speaker-mapping`
 *   `@repo/database/queries/meetings/project-summaries`
 *   `@repo/database/queries/meetings/themes`
 */

export * from "./core";
export * from "./lookup";
export * from "./pipeline-fetches";
export * from "./regenerate";
export * from "./metadata";
export * from "./speaker-mapping";
export * from "./project-summaries";
export * from "./themes";
