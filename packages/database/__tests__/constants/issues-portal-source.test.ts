import { describe, it, expect } from "vitest";
import { PORTAL_SOURCE_GROUPS, resolvePortalSourceGroup } from "../../src/constants/issues";

// CP-006 (SCHEMA-V1-02/03) — bron-mapping voor de v1 client portal.
// De helper is een pure functie zonder DB-call; deze test bewaakt dat
// onbekende sources defensief naar 'jaip' vallen (zie PRD §5.2). Als iemand
// die fallback per ongeluk weghaalt zou de portal opeens "Onze meldingen"
// tonen voor sources die de klant niet herkent.

describe("PORTAL_SOURCE_GROUPS", () => {
  it("definieert exact twee groepen: client en jaip", () => {
    const keys = PORTAL_SOURCE_GROUPS.map((g) => g.key);
    expect(keys).toEqual(["client", "jaip"]);
  });

  it("dekt portal/userback/jaip_widget onder client en manual/ai onder jaip", () => {
    const client = PORTAL_SOURCE_GROUPS.find((g) => g.key === "client");
    const jaip = PORTAL_SOURCE_GROUPS.find((g) => g.key === "jaip");
    expect(client?.sources).toEqual(["portal", "userback", "jaip_widget"]);
    expect(jaip?.sources).toEqual(["manual", "ai"]);
  });
});

describe("resolvePortalSourceGroup", () => {
  it("mapt portal, userback en jaip_widget naar 'client'", () => {
    expect(resolvePortalSourceGroup("portal")).toBe("client");
    expect(resolvePortalSourceGroup("userback")).toBe("client");
    // WG-004 (WG-REQ-078): widget-feedback is door de klant zelf gemeld via
    // de JAIP-eigen knop op zijn app — hoort in dezelfde bucket als portal
    // en userback. Zonder deze mapping zou hij default op 'jaip' vallen.
    expect(resolvePortalSourceGroup("jaip_widget")).toBe("client");
  });

  it("mapt manual en ai naar 'jaip'", () => {
    expect(resolvePortalSourceGroup("manual")).toBe("jaip");
    expect(resolvePortalSourceGroup("ai")).toBe("jaip");
  });

  it("valt terug op 'jaip' bij onbekende sources", () => {
    expect(resolvePortalSourceGroup("slack")).toBe("jaip");
    expect(resolvePortalSourceGroup("imported_csv")).toBe("jaip");
  });

  it("valt terug op 'jaip' bij null, undefined en lege string", () => {
    expect(resolvePortalSourceGroup(null)).toBe("jaip");
    expect(resolvePortalSourceGroup(undefined)).toBe("jaip");
    expect(resolvePortalSourceGroup("")).toBe("jaip");
  });
});
