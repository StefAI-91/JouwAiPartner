import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/ai/agents/gatekeeper", () => ({
  runGatekeeper: vi.fn(),
}));

vi.mock("@repo/database/queries/people", () => ({
  getAllKnownPeople: vi.fn(),
}));

vi.mock("@repo/database/queries/meetings", () => ({
  listMeetingsForReclassify: vi.fn(),
}));

vi.mock("@repo/database/mutations/meetings", () => ({
  updateMeetingClassification: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/entity-resolution", () => ({
  resolveOrganization: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/participant-classifier", () => ({
  classifyParticipantsWithCache: vi.fn(),
  determinePartyType: vi.fn(),
}));

import { runGatekeeper } from "@repo/ai/agents/gatekeeper";
import { getAllKnownPeople } from "@repo/database/queries/people";
import { listMeetingsForReclassify } from "@repo/database/queries/meetings";
import { updateMeetingClassification } from "@repo/database/mutations/meetings";
import { resolveOrganization } from "@repo/ai/pipeline/entity-resolution";
import {
  classifyParticipantsWithCache,
  determinePartyType,
} from "@repo/ai/pipeline/participant-classifier";
import { POST } from "../../src/app/api/cron/reclassify/route";

const CRON_SECRET = "test-cron-secret";

function makeRequest(body?: Record<string, unknown>): Request {
  return new Request("http://localhost/api/cron/reclassify", {
    method: "POST",
    headers: {
      authorization: `Bearer ${CRON_SECRET}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : JSON.stringify({}),
  });
}

describe("POST /api/cron/reclassify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  it("returns 401 without valid auth", async () => {
    const req = new Request("http://localhost/api/cron/reclassify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("returns empty results when no meetings need reclassification", async () => {
    vi.mocked(listMeetingsForReclassify).mockResolvedValue([]);

    const req = makeRequest();
    const res = await POST(req as never);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.total).toBe(0);
    expect(data.changed).toBe(0);
  });

  it("reclassifies meetings through Gatekeeper", async () => {
    const mockMeeting = {
      id: "m1",
      title: "Client call with Acme",
      summary: "Discussed project timeline",
      date: "2026-01-15",
      participants: ["Stef", "John Doe"],
      meeting_type: "unknown",
      party_type: "other",
      relevance_score: 0.5,
      raw_fireflies: {},
    };

    vi.mocked(listMeetingsForReclassify).mockResolvedValue([mockMeeting] as never);
    vi.mocked(getAllKnownPeople).mockResolvedValue([
      { name: "Stef", team: "leadership", organization_name: null, organization_type: null },
    ] as never);
    vi.mocked(classifyParticipantsWithCache).mockReturnValue([
      { raw: "Stef", label: "internal", matchedName: "Stef" },
      { raw: "John Doe", label: "external", organizationName: "Acme", organizationType: "client" },
    ] as never);
    vi.mocked(determinePartyType).mockReturnValue("client");
    vi.mocked(runGatekeeper).mockResolvedValue({
      meeting_type: "client_call",
      relevance_score: 0.9,
      reason: "Client discussion",
      organization_name: "Acme",
    } as never);
    vi.mocked(resolveOrganization).mockResolvedValue({
      organization_id: "org-1",
      matched: true,
    } as never);
    vi.mocked(updateMeetingClassification).mockResolvedValue({ success: true } as never);

    const req = makeRequest();
    const res = await POST(req as never);
    const data = await res.json();

    expect(runGatekeeper).toHaveBeenCalledTimes(1);
    expect(updateMeetingClassification).toHaveBeenCalledWith(
      "m1",
      expect.objectContaining({
        meeting_type: "client_call",
        party_type: "client",
        relevance_score: 0.9,
        organization_id: "org-1",
      }),
    );
    expect(data.total).toBe(1);
    expect(data.changed).toBe(1);
  });

  it("resolves organization via entity-resolution", async () => {
    const mockMeeting = {
      id: "m1",
      title: "Meeting",
      summary: "Summary",
      date: null,
      participants: ["Stef"],
      meeting_type: "internal",
      party_type: "internal",
      relevance_score: 0.5,
      raw_fireflies: {},
    };

    vi.mocked(listMeetingsForReclassify).mockResolvedValue([mockMeeting] as never);
    vi.mocked(getAllKnownPeople).mockResolvedValue([]);
    vi.mocked(classifyParticipantsWithCache).mockReturnValue([
      { raw: "Stef", label: "internal", matchedName: "Stef" },
    ] as never);
    vi.mocked(determinePartyType).mockReturnValue("internal");
    vi.mocked(runGatekeeper).mockResolvedValue({
      meeting_type: "internal",
      relevance_score: 0.7,
      reason: "Internal meeting",
      organization_name: null,
    } as never);
    vi.mocked(resolveOrganization).mockResolvedValue({
      organization_id: null,
      matched: false,
    } as never);
    vi.mocked(updateMeetingClassification).mockResolvedValue({ success: true } as never);

    const req = makeRequest();
    const res = await POST(req as never);
    const data = await res.json();

    expect(resolveOrganization).toHaveBeenCalledTimes(1);
    expect(data.total).toBe(1);
  });

  it("returns count of reclassified meetings", async () => {
    const meetings = [
      {
        id: "m1",
        title: "M1",
        summary: "S",
        date: null,
        participants: [],
        meeting_type: "unknown",
        party_type: "other",
        relevance_score: 0.5,
        raw_fireflies: {},
      },
      {
        id: "m2",
        title: "M2",
        summary: "S",
        date: null,
        participants: [],
        meeting_type: "internal",
        party_type: "internal",
        relevance_score: 0.7,
        raw_fireflies: {},
      },
    ];

    vi.mocked(listMeetingsForReclassify).mockResolvedValue(meetings as never);
    vi.mocked(getAllKnownPeople).mockResolvedValue([]);
    vi.mocked(classifyParticipantsWithCache).mockReturnValue([]);
    vi.mocked(determinePartyType).mockReturnValue("internal");
    vi.mocked(runGatekeeper)
      .mockResolvedValueOnce({
        meeting_type: "client_call",
        relevance_score: 0.9,
        reason: "",
        organization_name: null,
      } as never)
      .mockResolvedValueOnce({
        meeting_type: "internal",
        relevance_score: 0.7,
        reason: "",
        organization_name: null,
      } as never);
    vi.mocked(resolveOrganization).mockResolvedValue({
      organization_id: null,
      matched: false,
    } as never);
    vi.mocked(updateMeetingClassification).mockResolvedValue({ success: true } as never);

    const req = makeRequest();
    const res = await POST(req as never);
    const data = await res.json();

    expect(data.total).toBe(2);
    // m1 changed (unknown→client_call), m2 unchanged (internal→internal)
    expect(data.changed).toBe(1);
  });
});
