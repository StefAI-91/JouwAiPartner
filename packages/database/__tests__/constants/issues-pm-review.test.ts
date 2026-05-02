import { describe, it, expect } from "vitest";
import {
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  CLOSED_STATUSES,
  PORTAL_STATUS_GROUPS,
  INTERNAL_STATUS_TO_PORTAL_KEY,
  defaultStatusForSource,
  type IssueStatus,
} from "../../src/constants/issues";

// CC-001 — borgt dat de PM-review-gate constants synchroon blijven:
//   - elke status heeft een label
//   - elke status zit in een portal-groep (geen "wees-status" die de portal
//     niet kan vertalen)
//   - CLOSED_STATUSES dekt de juiste eind-statussen
//   - defaultStatusForSource routeert klant-bron naar needs_pm_review en
//     interne bronnen naar triage

describe("ISSUE_STATUSES — CC-001 PM-review-gate", () => {
  it("bevat de 4 nieuwe PM-statussen", () => {
    expect(ISSUE_STATUSES).toContain("needs_pm_review");
    expect(ISSUE_STATUSES).toContain("declined");
    expect(ISSUE_STATUSES).toContain("deferred");
    expect(ISSUE_STATUSES).toContain("converted_to_qa");
  });

  it("elke status heeft een label", () => {
    for (const status of ISSUE_STATUSES) {
      expect(ISSUE_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("elke status zit in een portal-groep — geen wees-status", () => {
    for (const status of ISSUE_STATUSES) {
      expect(INTERNAL_STATUS_TO_PORTAL_KEY[status]).toBeTruthy();
    }
  });
});

describe("CLOSED_STATUSES", () => {
  it("bevat done, cancelled, declined, converted_to_qa", () => {
    const statuses: IssueStatus[] = ["done", "cancelled", "declined", "converted_to_qa"];
    for (const s of statuses) {
      expect(CLOSED_STATUSES.has(s)).toBe(true);
    }
  });

  it("bevat NIET deferred (parked items kunnen terug in de flow)", () => {
    expect(CLOSED_STATUSES.has("deferred")).toBe(false);
  });

  it("bevat NIET needs_pm_review of triage", () => {
    expect(CLOSED_STATUSES.has("needs_pm_review")).toBe(false);
    expect(CLOSED_STATUSES.has("triage")).toBe(false);
  });
});

describe("PORTAL_STATUS_GROUPS", () => {
  it("groepeert needs_pm_review en triage onder 'ontvangen' (PM-fase lekt niet)", () => {
    const ontvangen = PORTAL_STATUS_GROUPS.find((g) => g.key === "ontvangen");
    expect(ontvangen?.internalStatuses).toContain("needs_pm_review");
    expect(ontvangen?.internalStatuses).toContain("triage");
  });

  it("groepeert deferred onder 'parked' met label 'Later'", () => {
    const parked = PORTAL_STATUS_GROUPS.find((g) => g.key === "parked");
    expect(parked).toBeTruthy();
    expect(parked?.label).toBe("Later");
    expect(parked?.internalStatuses).toEqual(["deferred"]);
  });

  it("groepeert declined en converted_to_qa onder 'afgerond'", () => {
    const afgerond = PORTAL_STATUS_GROUPS.find((g) => g.key === "afgerond");
    expect(afgerond?.internalStatuses).toContain("declined");
    expect(afgerond?.internalStatuses).toContain("converted_to_qa");
  });
});

describe("defaultStatusForSource", () => {
  it("klant-bronnen passeren de PM-gate (needs_pm_review)", () => {
    expect(defaultStatusForSource("portal")).toBe("needs_pm_review");
    expect(defaultStatusForSource("userback")).toBe("needs_pm_review");
    expect(defaultStatusForSource("jaip_widget")).toBe("needs_pm_review");
  });

  it("interne bronnen gaan direct naar triage", () => {
    expect(defaultStatusForSource("manual")).toBe("triage");
    expect(defaultStatusForSource("ai")).toBe("triage");
  });

  it("onbekende bronnen vallen terug op triage (intern als default)", () => {
    expect(defaultStatusForSource("slack")).toBe("triage");
    expect(defaultStatusForSource("")).toBe("triage");
  });
});
