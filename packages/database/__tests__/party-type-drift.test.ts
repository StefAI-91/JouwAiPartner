/**
 * HF-001: Contract-test die drift voorkomt tussen de TS enum en de
 * CHECK constraints op `meetings.party_type` + `emails.party_type`.
 *
 * Bron van waarheid: `packages/ai/src/validations/communication.ts::PARTY_TYPES`.
 * Beide DB-constraints MOETEN exact dezelfde set waardes accepteren, anders
 * komt er drift tussen wat de Gatekeeper / Email-classifier kan schrijven en
 * wat de database accepteert.
 *
 * Als deze test faalt:
 * 1. Check of iemand `PARTY_TYPES` in `@repo/ai/validations/communication.ts`
 *    heeft aangepast zonder een bijbehorende migratie.
 * 2. Check of iemand een migratie heeft gemaakt die de CHECK verbreed/versmald
 *    zonder de TS enum bij te werken.
 * Los altijd op bij de bron — niet door de test af te zwakken.
 */
import { describe, it, expect } from "vitest";
import { describeWithDb } from "./helpers/describe-with-db";
import { getTestClient } from "./helpers/test-client";

// Moet EXACT overeenkomen met PARTY_TYPES in
// packages/ai/src/validations/communication.ts. Alfabetisch gesorteerd zodat
// vergelijking volgorde-onafhankelijk is.
const EXPECTED_PARTY_TYPES = [
  "accountant",
  "advisor",
  "client",
  "internal",
  "lawyer",
  "other",
  "partner",
  "tax_advisor",
] as const;

/**
 * Parseert een CHECK constraint definition zoals
 * "CHECK ((party_type IS NULL) OR (party_type = ANY (ARRAY['client'::text, ...])))"
 * naar een alfabetisch gesorteerde lijst string-waardes.
 */
function parseCheckEnum(definition: string): string[] {
  const arrayMatch = definition.match(/ARRAY\[([^\]]+)\]/);
  if (!arrayMatch) {
    throw new Error(`Kon geen ARRAY[...] vinden in CHECK definition: ${definition}`);
  }
  const values = arrayMatch[1]
    .split(",")
    .map((s) =>
      s
        .trim()
        .replace(/::text$/, "")
        .replace(/^'/, "")
        .replace(/'$/, "")
        .trim(),
    )
    .filter(Boolean);
  return values.sort();
}

async function getCheckDef(table: string, constraint: string): Promise<string> {
  const svc = getTestClient();
  const { data, error } = await svc.rpc("pg_get_check_constraint_def", {
    p_table: table,
    p_constraint: constraint,
  });
  if (error) {
    throw new Error(
      `RPC pg_get_check_constraint_def failed voor ${table}/${constraint}: ${error.message}`,
    );
  }
  if (typeof data !== "string" || !data) {
    throw new Error(
      `CHECK constraint ${constraint} niet gevonden op ${table} — draai migratie 20260420100001_hf001_align_party_type?`,
    );
  }
  return data;
}

describeWithDb("party_type drift prevention (HF-001)", () => {
  it("meetings.party_type CHECK accepts exactly the PARTY_TYPES set", async () => {
    const def = await getCheckDef("meetings", "meetings_party_type_check");
    expect(parseCheckEnum(def)).toEqual([...EXPECTED_PARTY_TYPES]);
  });

  it("emails.party_type CHECK accepts exactly the PARTY_TYPES set", async () => {
    const def = await getCheckDef("emails", "emails_party_type_check");
    expect(parseCheckEnum(def)).toEqual([...EXPECTED_PARTY_TYPES]);
  });

  it("beide CHECK constraints zijn identiek", async () => {
    const meetingsDef = await getCheckDef("meetings", "meetings_party_type_check");
    const emailsDef = await getCheckDef("emails", "emails_party_type_check");

    expect(parseCheckEnum(meetingsDef)).toEqual(parseCheckEnum(emailsDef));
  });
});
