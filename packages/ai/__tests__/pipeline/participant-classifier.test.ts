import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/queries/people", () => ({
  getAllKnownPeople: vi.fn(),
}));

import {
  classifyParticipants,
  classifyParticipantsWithCache,
  determinePartyType,
} from "../../src/pipeline/participant-classifier";
import { getAllKnownPeople } from "@repo/database/queries/people";
import type { KnownPerson } from "@repo/database/queries/people";
import type { ParticipantInfo } from "../../src/agents/gatekeeper";

const mockGetAllKnownPeople = getAllKnownPeople as ReturnType<typeof vi.fn>;

const makePerson = (overrides: Partial<KnownPerson> & { name: string }): KnownPerson => ({
  id: "person-1",
  email: null,
  team: null,
  role: null,
  organization_id: null,
  organization_name: null,
  organization_type: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("classifyParticipants", () => {
  const knownPeople: KnownPerson[] = [
    makePerson({
      id: "p-1",
      name: "Stef de Vries",
      email: "stef@jouwaipartner.nl",
      team: "management",
    }),
    makePerson({
      id: "p-2",
      name: "Wouter Heuvel",
      email: "wouter@jaip.nl",
      team: "dev",
    }),
    makePerson({
      id: "p-3",
      name: "Jan Klant",
      email: "jan@klantbv.nl",
      team: null,
      organization_name: "Klant BV",
      organization_type: "client",
    }),
  ];

  it("@jouwaipartner.nl email → classificatie 'internal'", async () => {
    mockGetAllKnownPeople.mockResolvedValue(knownPeople);

    const result = await classifyParticipants(["stef@jouwaipartner.nl"]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("internal");
  });

  it("@jaip.nl email → classificatie 'internal'", async () => {
    mockGetAllKnownPeople.mockResolvedValue(knownPeople);

    const result = await classifyParticipants(["wouter@jaip.nl"]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("internal");
  });

  it("bekende persoon met team=true → 'internal'", () => {
    const result = classifyParticipantsWithCache(["Stef de Vries"], knownPeople);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("internal");
    expect(result[0].matchedName).toBe("Stef de Vries");
  });

  it("bekende persoon met organisatie → 'external'", () => {
    const result = classifyParticipantsWithCache(["Jan Klant"], knownPeople);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("external");
    expect(result[0].organizationName).toBe("Klant BV");
    expect(result[0].organizationType).toBe("client");
  });

  it("onbekende deelnemer → 'unknown'", () => {
    const result = classifyParticipantsWithCache(["random@onbekend.nl"], knownPeople);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("unknown");
  });

  it("splitst comma-separated namen in individuele deelnemers", () => {
    const result = classifyParticipantsWithCache(["Stef de Vries, Jan Klant"], knownPeople);

    expect(result).toHaveLength(2);
  });

  it("dedupliceert en normaliseert (lowercase)", () => {
    const result = classifyParticipantsWithCache(["STEF DE VRIES", "stef de vries"], knownPeople);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("internal");
  });

  it("onbekende @jouwaipartner.nl email zonder match in people → toch internal", () => {
    const result = classifyParticipantsWithCache(["nieuw@jouwaipartner.nl"], []);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("internal");
  });

  it("onbekende @jaip.nl email zonder match in people → toch internal", () => {
    const result = classifyParticipantsWithCache(["test@jaip.nl"], []);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("internal");
  });
});

describe("determinePartyType", () => {
  it("alle internal → retourneert 'internal'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "wouter", label: "internal" },
    ];

    expect(determinePartyType(participants)).toBe("internal");
  });

  it("mix met bekende external (org_type=client) → 'client'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "jan", label: "external", organizationType: "client" },
    ];

    expect(determinePartyType(participants)).toBe("client");
  });

  it("mix met bekende external (org_type=partner) → 'partner'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "partner-persoon", label: "external", organizationType: "partner" },
    ];

    expect(determinePartyType(participants)).toBe("partner");
  });

  it("onbekende mix → 'other'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "onbekend", label: "unknown" },
    ];

    expect(determinePartyType(participants)).toBe("other");
  });

  it("lege array → 'other'", () => {
    expect(determinePartyType([])).toBe("other");
  });
});
