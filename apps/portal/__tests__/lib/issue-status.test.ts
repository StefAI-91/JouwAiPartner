import { describe, it, expect } from "vitest";
import { translateStatus, getPortalStatusKey, STATUS_COLORS } from "@/lib/issue-status";

// Q3b §5: Portal-app eerste pure-helper test (geen mocks, geen DOM).

describe("translateStatus", () => {
  it("vertaalt 'triage' naar 'Ontvangen' (klant-label)", () => {
    expect(translateStatus("triage")).toBe("Ontvangen");
  });

  it("vertaalt 'in_progress' naar 'In behandeling'", () => {
    expect(translateStatus("in_progress")).toBe("In behandeling");
  });

  it("retourneert input ongewijzigd voor onbekende status (no silent loss)", () => {
    expect(translateStatus("totally_made_up")).toBe("totally_made_up");
  });
});

describe("getPortalStatusKey", () => {
  it("mapt interne status naar portal-key", () => {
    expect(getPortalStatusKey("triage")).toBe("ontvangen");
    expect(getPortalStatusKey("in_progress")).toBe("in_behandeling");
  });

  it("returnt null voor onbekende interne status (caller kiest fallback)", () => {
    expect(getPortalStatusKey("xyz")).toBeNull();
  });
});

describe("STATUS_COLORS", () => {
  it("heeft een kleur-class voor elke portal status-key", () => {
    expect(STATUS_COLORS).toHaveProperty("ontvangen");
    expect(STATUS_COLORS).toHaveProperty("ingepland");
    expect(STATUS_COLORS).toHaveProperty("in_behandeling");
    expect(STATUS_COLORS).toHaveProperty("afgerond");
  });
});
