import { describe, it, expect } from "vitest";
import { buildActionItemParticipants } from "../../src/pipeline/steps/action-item-specialist";
import type { KnownPerson } from "@repo/database/queries/people";

function person(overrides: Partial<KnownPerson> = {}): KnownPerson {
  return {
    id: "person-1",
    name: "Stef",
    email: "stef@jouwaipartner.nl",
    team: "core",
    role: "CEO",
    organization_id: "org-jaip",
    organization_name: "JouwAiPartner",
    organization_type: "internal",
    is_admin: true,
    ...overrides,
  };
}

describe("buildActionItemParticipants", () => {
  it("matcht op email (case-insensitive) en haalt role/org/org_type uit knownPeople", () => {
    const known = [person()];
    const out = buildActionItemParticipants(["STEF@jouwaipartner.nl"], known);

    expect(out).toEqual([
      { name: "Stef", role: "CEO", organization: "JouwAiPartner", organization_type: "internal" },
    ]);
  });

  it("matcht op naam wanneer email niet gegeven is", () => {
    const known = [person()];
    const out = buildActionItemParticipants(["Stef"], known);

    expect(out[0].role).toBe("CEO");
    expect(out[0].organization).toBe("JouwAiPartner");
  });

  it("fallback bij geen match: name is raw, rest null", () => {
    const known = [person()];
    const out = buildActionItemParticipants(["onbekend@elders.com"], known);

    expect(out).toEqual([
      { name: "onbekend@elders.com", role: null, organization: null, organization_type: null },
    ]);
  });

  it("dedup op naam (lowercase) zodat dubbele Fireflies-entries niet verdubbelen", () => {
    const known = [person()];
    const out = buildActionItemParticipants(["Stef", "STEF", "stef@jouwaipartner.nl"], known);

    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Stef");
  });

  it("skipt lege strings en whitespace-only entries", () => {
    const out = buildActionItemParticipants(["", "   ", "Sandra"], []);

    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Sandra");
  });

  it("mapt meerdere participants in één keer met juiste org-info per persoon", () => {
    const known = [
      person(),
      person({
        id: "person-2",
        name: "Sandra",
        email: "sandra@acme.com",
        team: null,
        role: "founder",
        organization_id: "org-acme",
        organization_name: "Acme BV",
        organization_type: "client",
        is_admin: false,
      }),
    ];

    const out = buildActionItemParticipants(["Stef", "Sandra"], known);

    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ name: "Stef", organization_type: "internal" });
    expect(out[1]).toMatchObject({ name: "Sandra", organization_type: "client" });
  });
});
