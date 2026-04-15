import { describe, it, expect, vi, beforeEach } from "vitest";

// Responses keyed by query pattern — recursive chainable mock
let queryResponses: Map<string, { data: unknown; error: unknown }>;

function createMockDb() {
  function makeResult(key: string): Record<string, unknown> {
    const resp = queryResponses.get(key) ?? { data: null, error: null };
    return {
      ...resp,
      single: vi.fn(() => resp),
      eq: vi.fn((col: string, val: unknown) => makeResult(`${key}.${col}=${val}`)),
      not: vi.fn((_c: string, _op: string, _v: unknown) => makeResult(`${key}.not`)),
      in: vi.fn((_col: string, _vals: unknown[]) => makeResult(`${key}.in`)),
      order: vi.fn(() => resp),
    };
  }

  const from = vi.fn((table: string) => ({
    select: vi.fn((_cols?: string) => ({
      eq: vi.fn((col: string, val: unknown) => makeResult(`${table}.${col}=${val}`)),
      in: vi.fn((_col: string, _vals: unknown[]) => makeResult(`${table}.in`)),
      not: vi.fn((_c: string, _op: string, _v: unknown) => makeResult(`${table}.not`)),
    })),
  }));

  return { from };
}

let mockDb: ReturnType<typeof createMockDb>;

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(() => mockDb),
}));
vi.mock("@repo/database/queries/summaries", () => ({
  getLatestSummary: vi.fn(),
}));
vi.mock("@repo/database/queries/meeting-project-summaries", () => ({
  getSegmentsByProjectId: vi.fn(),
}));
vi.mock("@repo/database/mutations/summaries", () => ({
  createSummaryVersion: vi.fn(),
}));
vi.mock("../../src/agents/project-summarizer", () => ({
  runProjectSummarizer: vi.fn(),
  runOrgSummarizer: vi.fn(),
}));

import {
  generateProjectSummaries,
  generateOrgSummaries,
  triggerSummariesForMeeting,
  triggerSummariesForEmail,
} from "../../src/pipeline/summary-pipeline";
import { getLatestSummary } from "@repo/database/queries/summaries";
import { getSegmentsByProjectId } from "@repo/database/queries/meeting-project-summaries";
import { createSummaryVersion } from "@repo/database/mutations/summaries";
import { runProjectSummarizer, runOrgSummarizer } from "../../src/agents/project-summarizer";

const mockGetLatestSummary = getLatestSummary as ReturnType<typeof vi.fn>;
const mockGetSegments = getSegmentsByProjectId as ReturnType<typeof vi.fn>;
const mockCreateVersion = createSummaryVersion as ReturnType<typeof vi.fn>;
const mockProjectSummarizer = runProjectSummarizer as ReturnType<typeof vi.fn>;
const mockOrgSummarizer = runOrgSummarizer as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  queryResponses = new Map();
  mockDb = createMockDb();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

function setupProjectFlow(projectId: string) {
  // db.from("projects").select("name").eq("id", projectId).single()
  queryResponses.set(`projects.id=${projectId}`, {
    data: { name: "Klantportaal" },
    error: null,
  });

  // db.from("meeting_projects").select("meeting_id").eq("project_id", projectId)
  queryResponses.set(`meeting_projects.project_id=${projectId}`, {
    data: [{ meeting_id: "m-1" }],
    error: null,
  });

  // db.from("email_projects").select("email_id").eq("project_id", projectId)
  queryResponses.set(`email_projects.project_id=${projectId}`, {
    data: [],
    error: null,
  });

  // db.from("meetings").select(...).in("id", [...]).eq("verification_status","verified").order(...)
  queryResponses.set("meetings.in", {
    data: [
      {
        id: "m-1",
        title: "Weekly standup",
        date: "2026-04-10",
        ai_briefing: "AI briefing",
        summary: "Samenvatting",
        meeting_type: "team_sync",
      },
    ],
    error: null,
  });
  queryResponses.set("meetings.in.verification_status=verified", {
    data: [
      {
        id: "m-1",
        title: "Weekly standup",
        date: "2026-04-10",
        ai_briefing: "AI briefing",
        summary: "Samenvatting",
        meeting_type: "team_sync",
      },
    ],
    error: null,
  });
}

function setupOrgFlow(orgId: string) {
  queryResponses.set(`organizations.id=${orgId}`, {
    data: { name: "Klant BV" },
    error: null,
  });
  queryResponses.set(`meetings.organization_id=${orgId}`, {
    data: null,
    error: null,
  });
  // Chain: .eq("organization_id", orgId).eq("verification_status", "verified").order(...)
  queryResponses.set(`meetings.organization_id=${orgId}.verification_status=verified`, {
    data: [
      {
        id: "m-1",
        title: "Klant meeting",
        date: "2026-04-10",
        ai_briefing: null,
        summary: "Klant update",
        meeting_type: "status_update",
      },
    ],
    error: null,
  });
}

describe("generateProjectSummaries", () => {
  it("haalt segments + vorige summary op", async () => {
    setupProjectFlow("proj-1");

    mockGetSegments.mockResolvedValue([]);
    mockGetLatestSummary.mockResolvedValue({ content: "Vorige context" });
    mockProjectSummarizer.mockResolvedValue({
      context: "Nieuwe context",
      briefing: "Nieuwe briefing",
      timeline: [],
    });
    mockCreateVersion.mockResolvedValue({ success: true, data: { id: "s-1", version: 1 } });

    await generateProjectSummaries("proj-1", ["m-1"]);

    expect(mockGetSegments).toHaveBeenCalledWith("proj-1", expect.anything());
    expect(mockGetLatestSummary).toHaveBeenCalledWith(
      "project",
      "proj-1",
      "context",
      expect.anything(),
    );
  });

  it("schrijft nieuwe summary versie via createSummaryVersion", async () => {
    setupProjectFlow("proj-1");

    mockGetSegments.mockResolvedValue([]);
    mockGetLatestSummary.mockResolvedValue(null);
    mockProjectSummarizer.mockResolvedValue({
      context: "Context text",
      briefing: "Briefing text",
      timeline: [],
    });
    mockCreateVersion.mockResolvedValue({ success: true, data: { id: "s-1", version: 1 } });

    await generateProjectSummaries("proj-1", ["m-1"]);

    expect(mockCreateVersion).toHaveBeenCalledTimes(2);
    expect(mockCreateVersion).toHaveBeenCalledWith(
      "project",
      "proj-1",
      "context",
      "Context text",
      ["m-1"],
      expect.anything(),
    );
    expect(mockCreateVersion).toHaveBeenCalledWith(
      "project",
      "proj-1",
      "briefing",
      "Briefing text",
      ["m-1"],
      expect.anything(),
      null,
    );
  });

  it("retourneert error als createSummaryVersion faalt", async () => {
    setupProjectFlow("proj-1");

    mockGetSegments.mockResolvedValue([]);
    mockGetLatestSummary.mockResolvedValue(null);
    mockProjectSummarizer.mockResolvedValue({
      context: "ctx",
      briefing: "br",
      timeline: [],
    });
    // First (context) succeeds, second (briefing) fails
    mockCreateVersion
      .mockResolvedValueOnce({ success: true, data: { id: "s-1", version: 1 } })
      .mockResolvedValueOnce({ error: "Write failed" });

    const result = await generateProjectSummaries("proj-1", ["m-1"]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Write failed");
  });

  it("retourneert { error } bij falende AI call", async () => {
    setupProjectFlow("proj-1");

    mockGetSegments.mockResolvedValue([]);
    mockGetLatestSummary.mockResolvedValue(null);
    mockProjectSummarizer.mockRejectedValue(new Error("AI timeout"));

    const result = await generateProjectSummaries("proj-1", ["m-1"]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI timeout");
  });

  it("retourneert error als project niet gevonden wordt", async () => {
    queryResponses.set("projects.id=proj-missing", { data: null, error: null });

    const result = await generateProjectSummaries("proj-missing");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Project not found");
  });

  it("retourneert error als geen meetings of emails gekoppeld zijn", async () => {
    queryResponses.set("projects.id=proj-1", {
      data: { name: "Leeg Project" },
      error: null,
    });
    // No meeting links
    queryResponses.set("meeting_projects.project_id=proj-1", {
      data: [],
      error: null,
    });
    // No email links
    queryResponses.set("email_projects.project_id=proj-1", {
      data: [],
      error: null,
    });

    const result = await generateProjectSummaries("proj-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Geen meetings of emails gekoppeld");
  });
});

describe("triggerSummariesForMeeting", () => {
  it("dispatcht project + org summaries parallel en vangt rejected promises op", async () => {
    // meeting_projects: project links
    queryResponses.set("meeting_projects.meeting_id=m-1", {
      data: [{ project_id: "proj-1" }],
      error: null,
    });
    // extractions: org IDs — chain: .eq("meeting_id", "m-1").not(...)
    queryResponses.set("extractions.meeting_id=m-1", {
      data: [],
      error: null,
    });
    queryResponses.set("extractions.meeting_id=m-1.not", {
      data: [{ organization_id: "org-1" }],
      error: null,
    });
    // meeting itself (for org check)
    queryResponses.set("meetings.id=m-1", {
      data: { organization_id: null },
      error: null,
    });

    // Setup generateProjectSummaries flow
    setupProjectFlow("proj-1");
    mockGetSegments.mockResolvedValue([]);
    mockGetLatestSummary.mockResolvedValue(null);
    mockProjectSummarizer.mockResolvedValue({
      context: "ctx",
      briefing: "br",
      timeline: [],
    });
    mockCreateVersion.mockResolvedValue({ success: true, data: { id: "s-1", version: 1 } });

    // Setup generateOrgSummaries flow — will fail (no verified meetings)
    setupOrgFlow("org-1");
    mockOrgSummarizer.mockResolvedValue({
      context: "org ctx",
      briefing: "org br",
      timeline: [],
    });

    // Should not throw even when some summaries fail
    await triggerSummariesForMeeting("m-1");

    // Project summarizer should have been called with the meeting data
    expect(mockProjectSummarizer).toHaveBeenCalledWith(
      "Klantportaal",
      [expect.objectContaining({ title: "Weekly standup" })],
      undefined, // existingContext (mockGetLatestSummary returned null → .content is undefined)
      [], // segments
      undefined, // no emails
    );
  });

  it("skipt als geen projecten of orgs gekoppeld zijn", async () => {
    queryResponses.set("meeting_projects.meeting_id=m-1", {
      data: [],
      error: null,
    });
    queryResponses.set("extractions.meeting_id=m-1", {
      data: [],
      error: null,
    });
    queryResponses.set("extractions.meeting_id=m-1.not", {
      data: [],
      error: null,
    });
    queryResponses.set("meetings.id=m-1", {
      data: { organization_id: null },
      error: null,
    });

    await triggerSummariesForMeeting("m-1");

    // No summaries should be generated
    expect(mockProjectSummarizer).not.toHaveBeenCalled();
    expect(mockOrgSummarizer).not.toHaveBeenCalled();
  });
});

describe("triggerSummariesForEmail", () => {
  it("dispatcht org summary voor email met organization_id", async () => {
    // email project links — no projects
    queryResponses.set("email_projects.email_id=e-1", {
      data: [],
      error: null,
    });
    // email has an organization
    queryResponses.set("emails.id=e-1", {
      data: { organization_id: "org-1" },
      error: null,
    });
    // email extractions org
    queryResponses.set("email_extractions.email_id=e-1", {
      data: [],
      error: null,
    });
    queryResponses.set("email_extractions.email_id=e-1.not", {
      data: [],
      error: null,
    });

    // org summaries — setup
    setupOrgFlow("org-1");
    mockOrgSummarizer.mockResolvedValue({
      context: "org ctx",
      briefing: "org br",
      timeline: [],
    });
    mockCreateVersion.mockResolvedValue({ success: true, data: { id: "s-1", version: 1 } });
    mockGetLatestSummary.mockResolvedValue(null);

    await triggerSummariesForEmail("e-1");

    // Org summarizer should have been called with meetings, no emails (mock default),
    // no existing context, and 0 projects (mock default count).
    expect(mockOrgSummarizer).toHaveBeenCalledWith(
      "Klant BV",
      [expect.objectContaining({ title: "Klant meeting" })],
      undefined, // existingContext
      undefined, // emails — mock returns no email rows
      0, // projectCount — mock returns no projects
    );
  });

  it("skipt als geen projecten of orgs gekoppeld zijn", async () => {
    queryResponses.set("email_projects.email_id=e-1", {
      data: [],
      error: null,
    });
    queryResponses.set("emails.id=e-1", {
      data: { organization_id: null },
      error: null,
    });
    queryResponses.set("email_extractions.email_id=e-1", {
      data: [],
      error: null,
    });
    queryResponses.set("email_extractions.email_id=e-1.not", {
      data: [],
      error: null,
    });

    await triggerSummariesForEmail("e-1");

    expect(mockProjectSummarizer).not.toHaveBeenCalled();
    expect(mockOrgSummarizer).not.toHaveBeenCalled();
  });
});
