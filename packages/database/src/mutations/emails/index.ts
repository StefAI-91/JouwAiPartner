/**
 * Publieke deur voor emails-mutations. Externe consumers importeren
 * `from "@repo/database/mutations/emails"`.
 *
 * SRP-013 splitste de oude flat `mutations/emails.ts` (295 r, 17 exports) op:
 *   - accounts.ts    — Google OAuth-account ops (upsert/tokens/sync/deactivate)
 *   - rows.ts        — emails-table CRUD + per-veld updates
 *   - review.ts      — RPC-calls voor review-gate (verify/reject)
 *   - linking.ts     — email_projects link/unlink
 *   - extractions.ts — email_extractions insert
 */

export * from "./accounts";
export * from "./rows";
export * from "./review";
export * from "./linking";
export * from "./extractions";
