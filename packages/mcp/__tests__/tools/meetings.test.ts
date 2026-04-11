import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/database/queries/meeting-project-summaries", () => ({
  getSegmentsByMeetingIds: vi.fn(),
}));

import { getAdminClient } from "@repo/database/supabase/admin";
import { getSegmentsByMeetingIds } from "@repo/database/queries/meeting-project-summaries";
import { registerMeetingTools } from "../../src/tools/meetings";
import { createMockSupabase, captureToolHandlers, getText } from "./_helpers";

const handlers = captureToolHandlers(registerMeetingTools);
const meetingHandler = handlers["get_meeting_summary"];

describe("get_meeting_summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSegmentsByMeetingIds).mockResolvedValue(new Map());
  });

  it("registers the tool", () => {
    expect(meetingHandler).toBeDefined();
  });

  it("returns error when neither meeting_id nor title_search is provided", async () => {
    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await meetingHandler({ include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Geef een meeting_id of title_search op");
  });

  it("fetches meeting by ID with extractions and segments", async () => {
    const mockMeeting = {
      id: "m1",
      title: "Sprint planning",
      date: "2026-01-15",
      participants: ["Stef", "Wouter"],
      summary: "We planned the sprint",
      meeting_type: "internal",
      party_type: "internal",
      relevance_score: 0.8,
      organization: { name: "JouwAI" },
      unmatched_organization_name: null,
      verification_status: "verified",
      verified_by: null,
      verified_at: null,
    };

    const mockExtractions = [
      {
        meeting_id: "m1",
        type: "action_item",
        content: "Deploy feature X",
        confidence: 0.9,
        transcript_ref: "Let's deploy feature X by Friday",
        metadata: { assignee: "Wouter", deadline: "2026-01-20" },
        corrected_by: null,
        corrected_at: null,
        verification_status: "verified",
        verified_by: null,
        verified_at: null,
      },
    ];

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: [mockMeeting], error: null },
        extractions: { data: mockExtractions, error: null },
        profiles: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await meetingHandler({
      meeting_id: "m1",
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain("Sprint planning");
    expect(text).toContain("Stef, Wouter");
    expect(text).toContain("We planned the sprint");
    expect(text).toContain("Deploy feature X");
    expect(text).toContain("Eigenaar: Wouter");
    expect(text).toContain("Deadline: 2026-01-20");
  });

  it("formats verification status for meetings", async () => {
    const mockMeeting = {
      id: "m1",
      title: "Test meeting",
      date: "2026-01-15",
      participants: [],
      summary: null,
      meeting_type: null,
      party_type: null,
      relevance_score: null,
      organization: null,
      unmatched_organization_name: null,
      verification_status: "verified",
      verified_by: "profile-1",
      verified_at: "2026-01-16T10:00:00Z",
    };

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: [mockMeeting], error: null },
        extractions: { data: [], error: null },
        profiles: { data: [{ id: "profile-1", full_name: "Ege" }], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await meetingHandler({ meeting_id: "m1", include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Verified by Ege");
  });

  it("searches by title with escapeLike applied", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await meetingHandler({
      title_search: "100%_done",
      include_drafts: false,
    });
    const text = getText(result);

    // Should have escaped the search term and returned not found
    expect(text).toContain('Geen meetings gevonden voor "100%_done"');
  });

  it("returns not-found message for non-existent meeting ID", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const nonExistentId = "550e8400-e29b-41d4-a716-446655440000";
    const result = await meetingHandler({ meeting_id: nonExistentId, include_drafts: false });
    const text = getText(result);

    expect(text).toContain(`Meeting ${nonExistentId} niet gevonden`);
  });

  it("resolves profile names from verified_by IDs", async () => {
    const mockMeeting = {
      id: "m1",
      title: "Test",
      date: null,
      participants: null,
      summary: null,
      meeting_type: null,
      party_type: null,
      relevance_score: null,
      organization: null,
      unmatched_organization_name: null,
      verification_status: "verified",
      verified_by: "uid-1",
      verified_at: "2026-01-01T00:00:00Z",
    };

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: [mockMeeting], error: null },
        extractions: { data: [], error: null },
        profiles: { data: [{ id: "uid-1", full_name: "Stef" }], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await meetingHandler({ meeting_id: "m1", include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Verified by Stef");
  });

  it("includes project segments when available", async () => {
    const mockMeeting = {
      id: "m1",
      title: "Project review",
      date: "2026-02-01",
      participants: [],
      summary: "Review",
      meeting_type: "review",
      party_type: "client",
      relevance_score: 0.9,
      organization: null,
      unmatched_organization_name: null,
      verification_status: "verified",
      verified_by: null,
      verified_at: null,
    };

    const segmentMap = new Map([
      [
        "m1",
        [
          {
            id: "seg1",
            meeting_id: "m1",
            project_id: "p1",
            project_name: "Platform",
            project_name_raw: null,
            kernpunten: ["Feature complete"],
            vervolgstappen: ["Deploy to production"],
          },
        ],
      ],
    ]);
    vi.mocked(getSegmentsByMeetingIds).mockResolvedValue(segmentMap as never);

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: [mockMeeting], error: null },
        extractions: { data: [], error: null },
        profiles: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await meetingHandler({ meeting_id: "m1", include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Project-segmenten");
    expect(text).toContain("Platform");
    expect(text).toContain("Feature complete");
    expect(text).toContain("Deploy to production");
  });

  it("returns error message on database error", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        meetings: { data: null, error: { message: "Connection failed" } },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await meetingHandler({ meeting_id: "m1", include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Error: Connection failed");
  });
});
