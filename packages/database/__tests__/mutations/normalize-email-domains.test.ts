import { describe, it, expect } from "vitest";
import { normalizeEmailDomains } from "../../src/mutations/organizations";

describe("normalizeEmailDomains", () => {
  it("retourneert lege array bij undefined of lege input", () => {
    expect(normalizeEmailDomains(undefined)).toEqual([]);
    expect(normalizeEmailDomains([])).toEqual([]);
  });

  it("trimt whitespace en lowercased", () => {
    expect(normalizeEmailDomains([" Finconnect.NL "])).toEqual(["finconnect.nl"]);
  });

  it("dedupliceert dubbele domeinen", () => {
    expect(normalizeEmailDomains(["finconnect.nl", "finconnect.nl"])).toEqual(["finconnect.nl"]);
  });

  it("dedupliceert case-insensitive (na lowercase)", () => {
    expect(normalizeEmailDomains(["Example.com", "EXAMPLE.com", "example.COM"])).toEqual([
      "example.com",
    ]);
  });

  it("filtert lege strings na trim eruit", () => {
    expect(normalizeEmailDomains(["", "   ", "valid.nl"])).toEqual(["valid.nl"]);
  });

  it("behoudt invoegvolgorde", () => {
    expect(normalizeEmailDomains(["c.com", "b.com", "a.com"])).toEqual(["c.com", "b.com", "a.com"]);
  });

  it("verwerkt mix van geldige + dubbele + lege waardes", () => {
    expect(
      normalizeEmailDomains(["FINCONNECT.NL", "  ", "belastingdienst.nl", "finconnect.nl"]),
    ).toEqual(["finconnect.nl", "belastingdienst.nl"]);
  });
});
