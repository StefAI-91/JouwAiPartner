import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/database/queries/meeting-project-summaries", () => ({
  getSegmentCountsByMeetingIds: vi.fn(),
}));

import { getAdminClient } from "@repo/database/supabase/admin";
import { getSegmentCountsByMeetingIds } from "@repo/database/queries/meeting-project-summaries";
import { registerListMeetingsTools } from "../../src/tools/list-meetings";
import { createMockSupabase, captureToolHandlers, getText } from "./_helpers";

const handlers = captureToolHandlers(registerListMeetingsTools);
const listHandler = handlers["list_meetings"];

describe("list_meetings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSegmentCountsByMeetingIds).mockResolvedValue(new Map());
  });

  it("registers the tool", () => {
    expect(listHandler).toBeDefined();
  });

  it("lists meetings with default verified filter", async () => {
    const mockMeetings = [
      {
        id: "m1",
        title: "Sprint planning",
        date: "2026-01-15",
        meeting_type: "internal",
        party_type: "internal",
        relevance_score: 0.8,
        participants: ["Stef"],
        organization: { id: "org1", name: "JouwAI" },
        unmatched_organization_name: null,
        verification_status: "verified",
      },
    ];

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: mockMeetings, error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await listHandler({ limit: 20, offset: 0, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("1 meetings gevonden");
    expect(text).toContain("Sprint planning");
    expect(text).toContain("JouwAI");
    // eq should have been called with verification_status filter
    expect(mockSupabase.from).toHaveBeenCalledWith("meetings");
  });

  it("filters by project via resolveProjectIds", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        projects: { data: [{ id: "p1" }], error: null },
        meeting_projects: { data: [{ meeting_id: "m1" }], error: null },
        meetings: {
          data: [
            {
              id: "m1",
              title: "Project meeting",
              date: "2026-01-15",
              meeting_type: "review",
              party_type: "client",
              relevance_score: null,
              participants: [],
              organization: null,
              unmatched_organization_name: null,
              verification_status: "verified",
            },
          ],
          error: null,
        },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await listHandler({
      project: "Platform",
      limit: 20,
      offset: 0,
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain("Project meeting");
  });

  it("returns not-found when project filter matches no projects", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        projects: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await listHandler({
      project: "Nonexistent",
      limit: 20,
      offset: 0,
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain('Geen project gevonden voor "Nonexistent"');
  });

  it("filters by organization via resolveOrganizationIds", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [{ id: "org1" }], error: null },
        meetings: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await listHandler({
      organization: "Acme",
      limit: 20,
      offset: 0,
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain("Geen meetings gevonden");
  });

  it("returns not-found when organization filter matches nothing", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await listHandler({
      organization: "Unknown Corp",
      limit: 20,
      offset: 0,
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain('Geen organisatie gevonden voor "Unknown Corp"');
  });

  it("filters by participant via resolveMeetingIdsByParticipant", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: [], error: null },
      },
      rpcResults: {
        search_meetings_by_participant: { data: [{ meeting_id: "m1" }], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await listHandler({
      participant: "Wouter",
      limit: 20,
      offset: 0,
      include_drafts: false,
    });

    // RPC was called for participant lookup
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "search_meetings_by_participant",
      expect.objectContaining({
        p_name: "Wouter",
      }),
    );
  });

  it("returns not-found when participant matches no meetings", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
      },
      rpcResults: {
        search_meetings_by_participant: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await listHandler({
      participant: "Nobody",
      limit: 20,
      offset: 0,
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain('Geen meetings gevonden met deelnemer "Nobody"');
  });

  it("includes segment counts per meeting", async () => {
    const mockMeetings = [
      {
        id: "m1",
        title: "Test",
        date: "2026-01-01",
        meeting_type: "internal",
        party_type: "internal",
        relevance_score: null,
        participants: [],
        organization: null,
        unmatched_organization_name: null,
        verification_status: "verified",
      },
    ];

    vi.mocked(getSegmentCountsByMeetingIds).mockResolvedValue(new Map([["m1", 3]]));

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: mockMeetings, error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await listHandler({ limit: 20, offset: 0, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Segments: 3");
  });

  it("shows pagination note when results equal limit", async () => {
    const mockMeetings = Array.from({ length: 2 }, (_, i) => ({
      id: `m${i}`,
      title: `Meeting ${i}`,
      date: "2026-01-01",
      meeting_type: "internal",
      party_type: "internal",
      relevance_score: null,
      participants: [],
      organization: null,
      unmatched_organization_name: null,
      verification_status: "verified",
    }));

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: mockMeetings, error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await listHandler({ limit: 2, offset: 0, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Meer resultaten beschikbaar");
    expect(text).toContain("offset=2");
  });

  it("returns error on database error", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: null, error: { message: "DB error" } },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await listHandler({ limit: 20, offset: 0, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Error: DB error");
  });
});
