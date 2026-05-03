import { describe, it, expect } from "vitest";
import { applyAssignedToFilter } from "../../src/queries/issues/_filters";
import { UNASSIGNED_SENTINEL } from "../../src/constants/issues";

/**
 * CC-008 — `listIssues` en `countFilteredIssues` deelden hun assignedTo-
 * filter-logica niet, en de count-tak miste de "alle uuids zijn rommel"-
 * fallback (CC-003 should-fix b). Sinds de extractie naar
 * `applyAssignedToFilter` is divergentie structureel onmogelijk.
 *
 * Deze test verifieert het pattern via een fake-builder die elke chained
 * call captured. Eén shared assertion voor beide call-sites — als de
 * helper wijzigt, beide blijven in lockstep.
 */

interface CapturedCall {
  method: "or" | "is" | "in" | "eq";
  args: unknown[];
}

function makeCapturingBuilder() {
  const calls: CapturedCall[] = [];
  const builder = {
    or(s: string) {
      calls.push({ method: "or", args: [s] });
      return builder;
    },
    is(col: string, v: null) {
      calls.push({ method: "is", args: [col, v] });
      return builder;
    },
    in(col: string, vals: string[]) {
      calls.push({ method: "in", args: [col, vals] });
      return builder;
    },
    eq(col: string, v: string) {
      calls.push({ method: "eq", args: [col, v] });
      return builder;
    },
  };
  return { builder, calls };
}

const VALID_UUID_A = "00000000-0000-4000-8000-000000000001";
const VALID_UUID_B = "00000000-0000-4000-8000-000000000002";

describe("applyAssignedToFilter", () => {
  it("doet niets bij undefined of lege array", () => {
    const { builder: a, calls: callsA } = makeCapturingBuilder();
    applyAssignedToFilter(a, undefined);
    expect(callsA).toEqual([]);

    const { builder: b, calls: callsB } = makeCapturingBuilder();
    applyAssignedToFilter(b, []);
    expect(callsB).toEqual([]);
  });

  it("alleen UNASSIGNED_SENTINEL → is(assigned_to, null)", () => {
    const { builder, calls } = makeCapturingBuilder();
    applyAssignedToFilter(builder, [UNASSIGNED_SENTINEL]);
    expect(calls).toEqual([{ method: "is", args: ["assigned_to", null] }]);
  });

  it("alleen geldige uuids → in(assigned_to, uuids)", () => {
    const { builder, calls } = makeCapturingBuilder();
    applyAssignedToFilter(builder, [VALID_UUID_A, VALID_UUID_B]);
    expect(calls).toEqual([{ method: "in", args: ["assigned_to", [VALID_UUID_A, VALID_UUID_B]] }]);
  });

  it("mix van sentinel + uuid → or(...)", () => {
    const { builder, calls } = makeCapturingBuilder();
    applyAssignedToFilter(builder, [UNASSIGNED_SENTINEL, VALID_UUID_A]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("or");
    const orArg = calls[0]?.args[0] as string;
    expect(orArg).toContain("assigned_to.is.null");
    expect(orArg).toContain(VALID_UUID_A);
  });

  it("alle waardes invalide → eq(assigned_to, zero-uuid) sentinel (geen widening)", () => {
    const { builder, calls } = makeCapturingBuilder();
    applyAssignedToFilter(builder, ["bogus-uuid"]);
    expect(calls).toEqual([
      { method: "eq", args: ["assigned_to", "00000000-0000-0000-0000-000000000000"] },
    ]);
  });

  it("CC-003 should-fix: identiek gedrag voor list- en count-call-sites op `bogus-uuid` (regression-bewijs)", () => {
    // Dezelfde input → identieke output op beide call-sites door dezelfde helper
    // te raken. Eerder bouwde countFilteredIssues hier een lege `.in()` waardoor
    // de count en de listcounts subtiel uiteen liepen.
    const input = ["bogus", "also-bogus"];

    const { builder: list, calls: listCalls } = makeCapturingBuilder();
    applyAssignedToFilter(list, input);

    const { builder: count, calls: countCalls } = makeCapturingBuilder();
    applyAssignedToFilter(count, input);

    expect(listCalls).toEqual(countCalls);
  });
});
