import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/pipeline/lib/entity-resolution", () => ({
  resolveOrganization: vi.fn(),
}));
vi.mock("@repo/database/queries/people", () => ({
  findPeopleByEmails: vi.fn(),
  findPersonOrgByEmail: vi.fn(),
}));
vi.mock("@repo/database/queries/organizations", () => ({
  findOrganizationIdByEmailDomain: vi.fn(),
}));

import { resolveEmailOrganization } from "../../src/pipeline/email/core";
import { resolveOrganization } from "../../src/pipeline/lib/entity-resolution";
import { findPersonOrgByEmail } from "@repo/database/queries/people";
import { findOrganizationIdByEmailDomain } from "@repo/database/queries/organizations";

const mockResolveOrg = resolveOrganization as ReturnType<typeof vi.fn>;
const mockFindPersonOrg = findPersonOrgByEmail as ReturnType<typeof vi.fn>;
const mockFindOrgByDomain = findOrganizationIdByEmailDomain as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: niemand matcht. Tests overschrijven wat ze nodig hebben.
  mockResolveOrg.mockResolvedValue({ matched: false, organization_id: null, match_type: "none" });
  mockFindPersonOrg.mockResolvedValue(null);
  mockFindOrgByDomain.mockResolvedValue(null);
});

describe("resolveEmailOrganization — prioriteits-volgorde", () => {
  it("strategy 1: alleen classifier matcht → match_source = 'classifier'", async () => {
    mockResolveOrg.mockResolvedValue({
      matched: true,
      organization_id: "org-classifier",
      match_type: "exact",
    });

    const result = await resolveEmailOrganization("jan@onbekend.nl", "Klant BV");

    expect(result.organization_id).toBe("org-classifier");
    expect(result.match_source).toBe("classifier");
    expect(result.sender_person_id).toBeNull();
    expect(result.unmatched_organization_name).toBeNull();
    expect(mockResolveOrg).toHaveBeenCalledWith("Klant BV");
  });

  it("strategy 2: alleen person matcht → match_source = 'person'", async () => {
    mockFindPersonOrg.mockResolvedValue({ personId: "person-1", organizationId: "org-person" });

    const result = await resolveEmailOrganization("jan@finconnect.nl", null);

    expect(result.organization_id).toBe("org-person");
    expect(result.match_source).toBe("person");
    expect(result.sender_person_id).toBe("person-1");
    expect(result.unmatched_organization_name).toBeNull();
  });

  it("strategy 3: alleen domain matcht → match_source = 'domain'", async () => {
    mockFindOrgByDomain.mockResolvedValue("org-domain");

    const result = await resolveEmailOrganization("nieuwjan@finconnect.nl", null);

    expect(result.organization_id).toBe("org-domain");
    expect(result.match_source).toBe("domain");
    expect(result.sender_person_id).toBeNull();
    expect(mockFindOrgByDomain).toHaveBeenCalledWith("finconnect.nl");
  });

  it("classifier wint over person+domain — en sender_person_id wordt nog steeds bewaard", async () => {
    mockResolveOrg.mockResolvedValue({
      matched: true,
      organization_id: "org-classifier",
      match_type: "exact",
    });
    mockFindPersonOrg.mockResolvedValue({ personId: "person-1", organizationId: "org-person" });
    mockFindOrgByDomain.mockResolvedValue("org-domain");

    const result = await resolveEmailOrganization("jan@finconnect.nl", "Klant BV");

    // classifier wint voor organization_id
    expect(result.organization_id).toBe("org-classifier");
    expect(result.match_source).toBe("classifier");
    // maar sender_person_id wordt onafhankelijk gezet
    expect(result.sender_person_id).toBe("person-1");
    // domain check zou niet meer moeten draaien als org_id al gezet is
    expect(mockFindOrgByDomain).not.toHaveBeenCalled();
  });

  it("person wint over domain — domain wordt overgeslagen", async () => {
    mockFindPersonOrg.mockResolvedValue({ personId: "person-1", organizationId: "org-person" });
    mockFindOrgByDomain.mockResolvedValue("org-domain");

    const result = await resolveEmailOrganization("jan@finconnect.nl", null);

    expect(result.organization_id).toBe("org-person");
    expect(result.match_source).toBe("person");
    expect(mockFindOrgByDomain).not.toHaveBeenCalled();
  });

  it("geen enkele match + classifier-naam aanwezig → unmatched_organization_name gezet", async () => {
    // alle defaults: niets matcht
    const result = await resolveEmailOrganization("jan@onbekend.nl", "Onbekende BV");

    expect(result.organization_id).toBeNull();
    expect(result.match_source).toBe("none");
    expect(result.unmatched_organization_name).toBe("Onbekende BV");
  });

  it("geen enkele match + geen classifier-naam → unmatched_organization_name blijft null", async () => {
    const result = await resolveEmailOrganization("jan@onbekend.nl", null);

    expect(result.organization_id).toBeNull();
    expect(result.match_source).toBe("none");
    expect(result.unmatched_organization_name).toBeNull();
  });

  it("person matcht (geen org koppeling) → sender_person_id gezet, val terug op domain", async () => {
    // Person bestaat wel maar heeft geen organization_id
    mockFindPersonOrg.mockResolvedValue({ personId: "person-1", organizationId: null });
    mockFindOrgByDomain.mockResolvedValue("org-domain");

    const result = await resolveEmailOrganization("jan@finconnect.nl", null);

    expect(result.sender_person_id).toBe("person-1");
    expect(result.organization_id).toBe("org-domain");
    expect(result.match_source).toBe("domain");
  });
});

describe("resolveEmailOrganization — edge cases in from_address", () => {
  it("lege from_address → geen domain-lookup, geen crash", async () => {
    const result = await resolveEmailOrganization("", null);

    expect(result.organization_id).toBeNull();
    expect(result.match_source).toBe("none");
    expect(mockFindOrgByDomain).not.toHaveBeenCalled();
  });

  it("from_address zonder @ → geen domain-lookup", async () => {
    const result = await resolveEmailOrganization("foo", null);

    expect(result.organization_id).toBeNull();
    expect(mockFindOrgByDomain).not.toHaveBeenCalled();
  });

  it("from_address als alleen '@' → geen domain-lookup", async () => {
    const result = await resolveEmailOrganization("@", null);

    expect(result.organization_id).toBeNull();
    expect(mockFindOrgByDomain).not.toHaveBeenCalled();
  });

  it("from_address met meerdere @ pakt het laatste deel als domein", async () => {
    mockFindOrgByDomain.mockResolvedValue("org-domain");

    const result = await resolveEmailOrganization("a@b@c.nl", null);

    expect(mockFindOrgByDomain).toHaveBeenCalledWith("c.nl");
    expect(result.organization_id).toBe("org-domain");
  });

  it("from_address eindigt op '@' (leeg domein) → geen domain-lookup", async () => {
    const result = await resolveEmailOrganization("jan@", null);

    expect(mockFindOrgByDomain).not.toHaveBeenCalled();
    expect(result.organization_id).toBeNull();
  });

  it("classifier returnt lege string → strategy 1 wordt overgeslagen", async () => {
    mockFindOrgByDomain.mockResolvedValue("org-domain");

    const result = await resolveEmailOrganization("jan@finconnect.nl", "");

    // resolveOrganization mag niet aangeroepen zijn met lege string
    expect(mockResolveOrg).not.toHaveBeenCalled();
    // En unmatched moet null blijven (lege string is geen "naam")
    expect(result.unmatched_organization_name).toBeNull();
    // Domain-fallback werkt wel
    expect(result.organization_id).toBe("org-domain");
    expect(result.match_source).toBe("domain");
  });

  it("from_address met UPPERCASE domein wordt lowercased voor lookup", async () => {
    mockFindOrgByDomain.mockResolvedValue("org-domain");

    await resolveEmailOrganization("Jan@FINCONNECT.NL", null);

    expect(mockFindOrgByDomain).toHaveBeenCalledWith("finconnect.nl");
  });
});
