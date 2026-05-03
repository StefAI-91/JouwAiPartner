import { describe, it, expect } from "vitest";
import { DEVHUB_SOURCE_GROUPS, resolveDevhubSourceGroup } from "../../src/constants/issues";

// CC-003 — DevHub-specifieke source-groepering. Verschil met PORTAL: intern
// (`manual`/`ai`) krijgt geen badge — resolver returnt `null`. Deze tests
// bewaken dat een nieuwe source niet stilletjes als "intern" wegvalt zonder
// review (zie CC-003 risico-tabel: divergentie PORTAL ↔ DEVHUB).

describe("DEVHUB_SOURCE_GROUPS", () => {
  it("definieert twee groepen: client_pm en end_user (geen jaip)", () => {
    const keys = DEVHUB_SOURCE_GROUPS.map((g) => g.key);
    expect(keys).toEqual(["client_pm", "end_user"]);
  });

  it("client_pm bevat 'portal', end_user bevat 'userback' + 'jaip_widget'", () => {
    const clientPm = DEVHUB_SOURCE_GROUPS.find((g) => g.key === "client_pm");
    const endUser = DEVHUB_SOURCE_GROUPS.find((g) => g.key === "end_user");
    expect(clientPm?.sources).toEqual(["portal"]);
    expect(endUser?.sources).toEqual(["userback", "jaip_widget"]);
  });
});

describe("resolveDevhubSourceGroup", () => {
  it("mapt portal naar 'client_pm'", () => {
    expect(resolveDevhubSourceGroup("portal")).toBe("client_pm");
  });

  it("mapt userback en jaip_widget naar 'end_user'", () => {
    expect(resolveDevhubSourceGroup("userback")).toBe("end_user");
    expect(resolveDevhubSourceGroup("jaip_widget")).toBe("end_user");
  });

  it("returnt null voor interne sources (manual, ai)", () => {
    // Geen badge = intern = default. Bewust géén fallback naar een visuele
    // groep — anders zou intern-werk misleidend als klant-werk getoond worden.
    expect(resolveDevhubSourceGroup("manual")).toBeNull();
    expect(resolveDevhubSourceGroup("ai")).toBeNull();
  });

  it("returnt null voor null, undefined en lege string", () => {
    expect(resolveDevhubSourceGroup(null)).toBeNull();
    expect(resolveDevhubSourceGroup(undefined)).toBeNull();
    expect(resolveDevhubSourceGroup("")).toBeNull();
  });

  it("returnt null voor onbekende sources (defensief)", () => {
    expect(resolveDevhubSourceGroup("slack")).toBeNull();
    expect(resolveDevhubSourceGroup("imported_csv")).toBeNull();
  });
});
