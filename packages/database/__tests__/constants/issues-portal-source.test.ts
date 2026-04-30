import { describe, it, expect } from "vitest";
import { PORTAL_SOURCE_GROUPS, resolvePortalSourceGroup } from "../../src/constants/issues";

// CP-006 (SCHEMA-V1-02/03) — bron-mapping voor de v1 client portal.
// De helper is een pure functie zonder DB-call; deze test bewaakt dat
// onbekende sources defensief naar 'jaip' vallen (zie PRD §5.2). Als iemand
// die fallback per ongeluk weghaalt zou de portal opeens "Onze meldingen"
// tonen voor sources die de klant niet herkent.

describe("PORTAL_SOURCE_GROUPS", () => {
  it("definieert drie groepen: portal_pm, end_users en jaip", () => {
    const keys = PORTAL_SOURCE_GROUPS.map((g) => g.key);
    expect(keys).toEqual(["portal_pm", "end_users", "jaip"]);
  });

  it("scheidt portal-PM van end-users en groepeert manual/ai onder jaip", () => {
    const portalPm = PORTAL_SOURCE_GROUPS.find((g) => g.key === "portal_pm");
    const endUsers = PORTAL_SOURCE_GROUPS.find((g) => g.key === "end_users");
    const jaip = PORTAL_SOURCE_GROUPS.find((g) => g.key === "jaip");
    expect(portalPm?.sources).toEqual(["portal"]);
    // WG-004: jaip_widget hoort in dezelfde bucket als userback — beide zijn
    // embedded feedback-knoppen op de client-app, niet door de PM ingediend.
    expect(endUsers?.sources).toEqual(["userback", "jaip_widget"]);
    expect(jaip?.sources).toEqual(["manual", "ai"]);
  });
});

describe("resolvePortalSourceGroup", () => {
  it("mapt portal naar 'portal_pm' en userback/jaip_widget naar 'end_users'", () => {
    expect(resolvePortalSourceGroup("portal")).toBe("portal_pm");
    expect(resolvePortalSourceGroup("userback")).toBe("end_users");
    // WG-004 (WG-REQ-078): widget-feedback wordt via de JAIP-eigen knop op de
    // client-app gemeld — eindgebruiker-categorie, niet PM-categorie.
    expect(resolvePortalSourceGroup("jaip_widget")).toBe("end_users");
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
