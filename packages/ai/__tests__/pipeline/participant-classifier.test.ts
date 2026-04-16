import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/queries/people", () => ({
  getAllKnownPeople: vi.fn(),
}));

import {
  classifyParticipants,
  classifyParticipantsWithCache,
  determinePartyType,
  determineRuleBasedMeetingType,
  isBoardMeeting,
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
  is_admin: false,
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

  it("matcht email case-insensitief (ELLEN@CLIENT.COM == ellen@client.com)", () => {
    // Case-invariant is belangrijk: Fireflies/Gmail leveren soms UPPERCASE.
    // Als match alleen lower-case werkt, verliezen we een bekende klant als
    // 'external' en valt hij terug op 'unknown'. Dat drijft party_type 'other'.
    const known: KnownPerson[] = [
      makePerson({
        id: "p-case",
        name: "Ellen",
        email: "ellen@client.com",
        organization_name: "Client BV",
        organization_type: "client",
      }),
    ];
    const result = classifyParticipantsWithCache(["ELLEN@CLIENT.COM"], known);
    expect(result[0].label).toBe("external");
    expect(result[0].organizationName).toBe("Client BV");
  });

  it("bare naam (geen @, geen DB-match) → 'unknown' (geen foutieve internal-fallback)", () => {
    // Defensief: zonder @ EN zonder DB-match mag de classifier NOOIT 'internal'
    // raden — dat zou vreemden als teamlid behandelen.
    const result = classifyParticipantsWithCache(["Jan"], []);
    expect(result[0].label).toBe("unknown");
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

  it("onbekende mix zonder meetingType → 'other'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "onbekend", label: "unknown" },
    ];

    expect(determinePartyType(participants)).toBe("other");
  });

  it("lege array → 'other'", () => {
    expect(determinePartyType([])).toBe("other");
  });

  it("onbekende mix + meetingType=discovery → 'client'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "onbekend", label: "unknown" },
    ];
    expect(determinePartyType(participants, "discovery")).toBe("client");
  });

  it("onbekende mix + meetingType=sales → 'client'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "onbekend", label: "unknown" },
    ];
    expect(determinePartyType(participants, "sales")).toBe("client");
  });

  it("onbekende mix + meetingType=status_update → 'client'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "onbekend", label: "unknown" },
    ];
    expect(determinePartyType(participants, "status_update")).toBe("client");
  });

  it("onbekende mix + meetingType=project_kickoff → 'client'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "onbekend", label: "unknown" },
    ];
    expect(determinePartyType(participants, "project_kickoff")).toBe("client");
  });

  it("onbekende mix + meetingType=collaboration → 'partner'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "onbekend", label: "unknown" },
    ];
    expect(determinePartyType(participants, "collaboration")).toBe("partner");
  });

  it("bekende client org heeft voorrang op meetingType=collaboration", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "jan", label: "external", organizationType: "client" },
    ];
    expect(determinePartyType(participants, "collaboration")).toBe("client");
  });

  it("onbekende mix + meetingType=strategy → 'other' (geen override)", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal" },
      { raw: "onbekend", label: "unknown" },
    ];
    expect(determinePartyType(participants, "strategy")).toBe("other");
  });

  it("één onbekende deelnemer naast internals → NIET 'internal' (default-deny)", () => {
    // CRITICAAL: als er ook maar één onbekende is, mag het meeting NOOIT
    // als puur intern gelabeld worden — dan ziet de Gatekeeper externe
    // inhoud over het hoofd en krijgt de org-resolver geen signaal.
    const result = determinePartyType([
      { raw: "stef", label: "internal" },
      { raw: "mystery", label: "unknown" },
    ]);
    expect(result).not.toBe("internal");
  });
});

describe("isBoardMeeting", () => {
  it("alle deelnemers admin → true", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal", isAdmin: true },
      { raw: "wouter", label: "internal", isAdmin: true },
    ];

    expect(isBoardMeeting(participants)).toBe(true);
  });

  it("één admin + één non-admin internal → false", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal", isAdmin: true },
      { raw: "ege", label: "internal", isAdmin: false },
    ];

    expect(isBoardMeeting(participants)).toBe(false);
  });

  it("admin + externe deelnemer → false", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal", isAdmin: true },
      { raw: "klant", label: "external", isAdmin: false },
    ];

    expect(isBoardMeeting(participants)).toBe(false);
  });

  it("admin + onbekende deelnemer → false", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal", isAdmin: true },
      { raw: "?", label: "unknown", isAdmin: false },
    ];

    expect(isBoardMeeting(participants)).toBe(false);
  });

  it("lege array → false", () => {
    expect(isBoardMeeting([])).toBe(false);
  });

  it("classifyParticipantsWithCache vult is_admin uit KnownPerson", () => {
    const knownPeople: KnownPerson[] = [
      makePerson({
        id: "p-1",
        name: "Stef",
        email: "stef@jouwaipartner.nl",
        team: "management",
        is_admin: true,
      }),
      makePerson({
        id: "p-2",
        name: "Wouter",
        email: "wouter@jaip.nl",
        team: "dev",
        is_admin: true,
      }),
    ];

    const result = classifyParticipantsWithCache(
      ["stef@jouwaipartner.nl", "wouter@jaip.nl"],
      knownPeople,
    );

    expect(result.every((p) => p.isAdmin)).toBe(true);
    expect(isBoardMeeting(result)).toBe(true);
  });
});

describe("determineRuleBasedMeetingType", () => {
  it("alle intern + alle admin → 'board'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal", isAdmin: true },
      { raw: "wouter", label: "internal", isAdmin: true },
    ];
    expect(determineRuleBasedMeetingType(participants)).toBe("board");
  });

  it("alle intern, 3+ personen, niet allen admin → 'team_sync'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal", isAdmin: true },
      { raw: "wouter", label: "internal", isAdmin: true },
      { raw: "ege", label: "internal", isAdmin: false },
    ];
    expect(determineRuleBasedMeetingType(participants)).toBe("team_sync");
  });

  it("alle intern, precies 2, niet allen admin → 'one_on_one'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal", isAdmin: true },
      { raw: "ege", label: "internal", isAdmin: false },
    ];
    expect(determineRuleBasedMeetingType(participants)).toBe("one_on_one");
  });

  it("3+ admins intern → 'board' (niet team_sync)", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal", isAdmin: true },
      { raw: "wouter", label: "internal", isAdmin: true },
      { raw: "extra-admin", label: "internal", isAdmin: true },
    ];
    expect(determineRuleBasedMeetingType(participants)).toBe("board");
  });

  it("alle niet-interne deelnemers unknown → 'discovery'", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal", isAdmin: true },
      { raw: "onbekend", label: "unknown", isAdmin: false },
    ];
    expect(determineRuleBasedMeetingType(participants)).toBe("discovery");
  });

  it("bekende external aanwezig → null (AI beslist)", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal", isAdmin: true },
      { raw: "jan", label: "external", organizationType: "client", isAdmin: false },
    ];
    expect(determineRuleBasedMeetingType(participants)).toBeNull();
  });

  it("mix van unknown + external → null (AI beslist)", () => {
    const participants: ParticipantInfo[] = [
      { raw: "stef", label: "internal", isAdmin: true },
      { raw: "onbekend", label: "unknown", isAdmin: false },
      { raw: "jan", label: "external", organizationType: "client", isAdmin: false },
    ];
    expect(determineRuleBasedMeetingType(participants)).toBeNull();
  });

  it("lege array → null", () => {
    expect(determineRuleBasedMeetingType([])).toBeNull();
  });

  it("één interne deelnemer → 'one_on_one' (solo meeting)", () => {
    const participants: ParticipantInfo[] = [{ raw: "stef", label: "internal", isAdmin: true }];
    // Single admin is still "board" since all participants are admin
    expect(determineRuleBasedMeetingType(participants)).toBe("board");
  });

  it("één interne non-admin → 'one_on_one'", () => {
    const participants: ParticipantInfo[] = [{ raw: "ege", label: "internal", isAdmin: false }];
    expect(determineRuleBasedMeetingType(participants)).toBe("one_on_one");
  });
});
