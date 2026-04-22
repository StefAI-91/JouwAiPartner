import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/database/queries/meeting-project-summaries", () => ({
  getSegmentCountsByProjectIds: vi.fn(),
}));

import { getAdminClient } from "@repo/database/supabase/admin";
import { getSegmentCountsByProjectIds } from "@repo/database/queries/meeting-project-summaries";
import { registerDecisionTools } from "../../src/tools/decisions";
import { registerOrganizationTools } from "../../src/tools/organizations";
import { registerProjectTools } from "../../src/tools/projects";
import { registerPeopleTools } from "../../src/tools/people";
import { registerOrganizationOverviewTools } from "../../src/tools/get-organization-overview";
import { createMockSupabase, captureToolHandlers, getText } from "./_helpers";

// ── Tool-registry tripwire ───────────────────────────────────────────────────
// Concrete check (Q3b §1.3) ipv 5x toBeDefined-smoketests: assert dat elke
// register-functie precies de verwachte set tool-namen registreert. Zo
// vangen we én typo's bij registratie én stille verwijdering, zonder zwakke
// assertions per tool.

describe("read-tools registry", () => {
  it.each([
    [registerDecisionTools, ["get_decisions"]],
    [registerOrganizationTools, ["get_organizations"]],
    [registerProjectTools, ["get_projects"]],
    [registerPeopleTools, ["get_people"]],
    [registerOrganizationOverviewTools, ["get_organization_overview"]],
  ])("registreert exact de verwachte tool-namen", (registerFn, expectedNames) => {
    const handlers = captureToolHandlers(registerFn);
    expect(Object.keys(handlers).sort()).toEqual(expectedNames.sort());
  });
});

// ── Decisions ────────────────────────────────────────────────────────────────

describe("get_decisions", () => {
  const handlers = captureToolHandlers(registerDecisionTools);
  const handler = handlers["get_decisions"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats decisions with verification status and profile names", async () => {
    const mockDecisions = [
      {
        id: "d1",
        content: "We adopt Tailwind v4",
        confidence: 0.95,
        transcript_ref: "Let's go with Tailwind v4",
        metadata: { made_by: "Stef" },
        corrected_by: null,
        corrected_at: null,
        created_at: "2026-01-15",
        verification_status: "verified",
        verified_by: "uid-1",
        verified_at: "2026-01-16T10:00:00Z",
        meeting: { id: "m1", title: "Architecture", date: "2026-01-15", participants: [] },
        organization: null,
        project: { name: "Platform" },
      },
    ];

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        extractions: { data: mockDecisions, error: null },
        profiles: { data: [{ id: "uid-1", full_name: "Stef" }], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ limit: 20, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("1 besluiten gevonden");
    expect(text).toContain("We adopt Tailwind v4");
    expect(text).toContain("Verified by Stef");
    expect(text).toContain("Besluit door: Stef");
    expect(text).toContain("Platform");
    expect(text).toContain('Citaat: "Let\'s go with Tailwind v4"');
  });

  it("filters by project via resolveProjectIds", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        projects: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ project: "Nonexistent", limit: 20, include_drafts: false });
    const text = getText(result);

    expect(text).toContain('Geen project gevonden voor "Nonexistent"');
  });

  it("returns empty message when no decisions found", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        extractions: { data: [], error: null },
        profiles: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ limit: 20, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Geen besluiten gevonden");
  });

  it("returns error on database error", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        extractions: { data: null, error: { message: "Connection timeout" } },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ limit: 20, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Error: Connection timeout");
  });
});

// ── Organizations ────────────────────────────────────────────────────────────

describe("get_organizations", () => {
  const handlers = captureToolHandlers(registerOrganizationTools);
  const handler = handlers["get_organizations"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists organizations with aliases and contact info", async () => {
    const mockOrgs = [
      {
        id: "org1",
        name: "Acme Corp",
        aliases: ["ACME", "Acme"],
        type: "client",
        contact_person: "John Doe",
        email: "john@acme.com",
        status: "active",
      },
    ];

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: mockOrgs, error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ limit: 50, offset: 0 });
    const text = getText(result);

    expect(text).toContain("1 organisaties");
    expect(text).toContain("Acme Corp");
    expect(text).toContain("ACME, Acme");
    expect(text).toContain("John Doe");
    expect(text).toContain("john@acme.com");
  });

  it("applies search filter with escaped like characters", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ search: "100%_test", limit: 50, offset: 0 });
    const text = getText(result);

    // Should have escaped the search and found nothing
    expect(text).toContain("Geen organisaties gevonden");
    // The from chain should have called .or() with escaped values
    expect(mockSupabase.from).toHaveBeenCalledWith("organizations");
  });

  it("returns empty message when no organizations found", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ limit: 50, offset: 0 });
    const text = getText(result);

    expect(text).toContain("Geen organisaties gevonden");
  });
});

// ── Projects ─────────────────────────────────────────────────────────────────

describe("get_projects", () => {
  const handlers = captureToolHandlers(registerProjectTools);
  const handler = handlers["get_projects"];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSegmentCountsByProjectIds).mockResolvedValue(new Map());
  });

  it("lists projects with segment counts", async () => {
    const mockProjects = [
      {
        id: "p1",
        name: "Knowledge Platform",
        aliases: ["KP"],
        status: "active",
        organization: { name: "JouwAI" },
      },
    ];

    vi.mocked(getSegmentCountsByProjectIds).mockResolvedValue(new Map([["p1", 5]]));

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        projects: { data: mockProjects, error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ limit: 50, offset: 0 });
    const text = getText(result);

    expect(text).toContain("1 projecten");
    expect(text).toContain("Knowledge Platform");
    expect(text).toContain("KP");
    expect(text).toContain("JouwAI");
    expect(text).toContain("Segments: 5");
    // UUID moet zichtbaar zijn zodat Claude hem kan doorgeven aan vervolg-tools
    expect(text).toContain("ID: p1");
  });

  it("filters by organization", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ organization: "Nonexistent", limit: 50, offset: 0 });
    const text = getText(result);

    expect(text).toContain('Geen organisatie gevonden voor "Nonexistent"');
  });

  it("applies search with escaped like characters", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        projects: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ search: "test%_project", limit: 50, offset: 0 });
    const text = getText(result);

    expect(text).toContain("Geen projecten gevonden");
  });

  it("returns empty message when no projects found", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        projects: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ limit: 50, offset: 0 });
    const text = getText(result);

    expect(text).toContain("Geen projecten gevonden");
  });
});

// ── People ───────────────────────────────────────────────────────────────────

describe("get_people", () => {
  const handlers = captureToolHandlers(registerPeopleTools);
  const handler = handlers["get_people"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists people with role, team, and email", async () => {
    const mockPeople = [
      {
        id: "p1",
        name: "Stef",
        email: "stef@jouwai.nl",
        team: "leadership",
        role: "CEO",
      },
    ];

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        people: { data: mockPeople, error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ limit: 50, offset: 0 });
    const text = getText(result);

    expect(text).toContain("1 mensen");
    expect(text).toContain("Stef");
    expect(text).toContain("CEO");
    expect(text).toContain("leadership");
    expect(text).toContain("stef@jouwai.nl");
  });

  it("applies search with escaped like characters", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        people: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ search: "test_name", limit: 50, offset: 0 });
    const text = getText(result);

    // Should escape underscore and find nothing
    expect(text).toContain("Geen mensen gevonden");
  });

  it("returns empty message when no people found", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        people: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ limit: 50, offset: 0 });
    const text = getText(result);

    expect(text).toContain("Geen mensen gevonden");
  });

  it("shows 'Geen details' when person has no role, team, or email", async () => {
    const mockPeople = [{ id: "p1", name: "Anonymous", email: null, team: null, role: null }];

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        people: { data: mockPeople, error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({ limit: 50, offset: 0 });
    const text = getText(result);

    expect(text).toContain("Geen details");
  });
});

// ── Organization Overview ────────────────────────────────────────────────────

describe("get_organization_overview", () => {
  const handlers = captureToolHandlers(registerOrganizationOverviewTools);
  const handler = handlers["get_organization_overview"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("combines org data with projects, meetings, and extractions", async () => {
    const mockOrg = {
      id: "org1",
      name: "Acme Corp",
      aliases: ["ACME"],
      type: "client",
      contact_person: "John",
      email: "john@acme.com",
      status: "active",
    };

    const mockProjects = [{ id: "p1", name: "Website Redesign", aliases: [], status: "active" }];

    const mockMeetings = [
      {
        id: "m1",
        title: "Kickoff meeting",
        date: "2026-01-15",
        meeting_type: "kickoff",
        party_type: "client",
        relevance_score: 0.9,
        summary: "We kicked off the project and discussed requirements",
        verification_status: "verified",
        verified_by: null,
        verified_at: null,
      },
    ];

    const mockExtractions = [
      {
        type: "decision",
        content: "Use React for frontend",
        confidence: 0.9,
        metadata: { made_by: "John" },
        transcript_ref: null,
        corrected_by: null,
        meeting_id: "m1",
        verification_status: "verified",
        verified_by: null,
        verified_at: null,
      },
    ];

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [mockOrg], error: null },
        projects: { data: mockProjects, error: null },
        meetings: { data: mockMeetings, error: null },
        extractions: { data: mockExtractions, error: null },
        profiles: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({
      organization_name: "Acme",
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain("# Acme Corp");
    expect(text).toContain("ACME");
    expect(text).toContain("client");
    expect(text).toContain("John");
    expect(text).toContain("john@acme.com");
    expect(text).toContain("Website Redesign");
    expect(text).toContain("Kickoff meeting");
    expect(text).toContain("Use React for frontend");
    expect(text).toContain("Besluiten");
    expect(text).toContain("1 projecten, 1 meetings, 1 extracties");
  });

  it("returns not-found when organization does not exist", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({
      organization_name: "Nonexistent Corp",
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain('Geen organisatie gevonden voor "Nonexistent Corp"');
  });

  it("shows empty sections when org has no data", async () => {
    const mockOrg = {
      id: "org1",
      name: "Empty Org",
      aliases: [],
      type: "prospect",
      contact_person: null,
      email: null,
      status: "prospect",
    };

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [mockOrg], error: null },
        projects: { data: [], error: null },
        meetings: { data: [], error: null },
        extractions: { data: [], error: null },
        profiles: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({
      organization_name: "Empty",
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain("Geen projecten gekoppeld");
    expect(text).toContain("Geen meetings gevonden");
    expect(text).toContain("Nog geen extracties beschikbaar");
    expect(text).toContain("0 projecten, 0 meetings, 0 extracties");
  });

  it("returns error when meetings query fails", async () => {
    const mockOrg = {
      id: "org1",
      name: "Error Org",
      aliases: [],
      type: "client",
      contact_person: null,
      email: null,
      status: "active",
    };

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [mockOrg], error: null },
        projects: { data: [], error: null },
        meetings: { data: null, error: { message: "Meetings query failed" } },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({
      organization_name: "Error",
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain("Error bij ophalen meetings: Meetings query failed");
  });

  it("returns error when extractions query fails", async () => {
    const mockOrg = {
      id: "org1",
      name: "Error Org",
      aliases: [],
      type: "client",
      contact_person: null,
      email: null,
      status: "active",
    };

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [mockOrg], error: null },
        projects: { data: [], error: null },
        meetings: { data: [], error: null },
        extractions: { data: null, error: { message: "Extractions query failed" } },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await handler({
      organization_name: "Error",
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain("Error bij ophalen extracties: Extractions query failed");
  });
});
