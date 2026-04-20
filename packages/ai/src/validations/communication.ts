import { z } from "zod";

/**
 * Shared party_type enum for both meetings and emails (HF-001).
 *
 * Één bron van waarheid zodat meeting-party_type en email-party_type niet
 * uit sync kunnen lopen. De `party-type-drift.test.ts` contract-test valideert
 * dat de CHECK constraints op `meetings.party_type` en `emails.party_type`
 * exact deze 8 waardes bevatten.
 *
 * `supplier` hoort NIET hier — dat is een `organizations.type` waarde, geen
 * party_type. Een supplier-organisatie valt onder `other` als party_type.
 *
 * Volgorde is stabiel; wijzigen vereist migratie op beide CHECK constraints.
 */
export const PARTY_TYPES = [
  "internal",
  "client",
  "partner",
  "accountant",
  "tax_advisor",
  "lawyer",
  "advisor",
  "other",
] as const;

export type PartyType = (typeof PARTY_TYPES)[number];

export const PartyTypeSchema = z.enum(PARTY_TYPES);
