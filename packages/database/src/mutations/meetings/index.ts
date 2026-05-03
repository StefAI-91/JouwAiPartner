/**
 * Publieke deur voor meetings-mutations. Via `export *` zijn alle
 * sub-files bereikbaar op `@repo/database/mutations/meetings`.
 * Fine-grained via bv. `.../meetings/participants`,
 * `.../meetings/project-summaries`, `.../meetings/themes`.
 *
 * SRP-013 splitste de oude `core.ts` (343 r, 19 exports) in:
 *   - crud.ts           — insert/insertManual/delete
 *   - classification.ts — type/party/title/organization + compound classifier-update
 *   - linking.ts        — meeting_projects link/unlink (incl. bulk)
 *   - pipeline.ts       — transcript/summary/raw/embedding-stale + park/restore
 */

export * from "./crud";
export * from "./classification";
export * from "./linking";
export * from "./pipeline";
export * from "./participants";
export * from "./project-summaries";
export * from "./themes";
