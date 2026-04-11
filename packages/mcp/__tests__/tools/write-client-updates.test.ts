import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/database/mutations/meetings", () => ({
  insertManualMeeting: vi.fn(),
}));

vi.mock("@repo/database/mutations/extractions", () => ({
  insertExtractions: vi.fn(),
}));

vi.mock("@repo/database/queries/people", () => ({
  findProfileIdByName: vi.fn(),
}));

import { getAdminClient } from "@repo/database/supabase/admin";
import { insertManualMeeting } from "@repo/database/mutations/meetings";
import { insertExtractions } from "@repo/database/mutations/extractions";
import { registerWriteClientUpdateTools } from "../../src/tools/write-client-updates";
import { createMockSupabase, captureToolHandlers, getText } from "./_helpers";

const handlers = captureToolHandlers(registerWriteClientUpdateTools);
const logHandler = handlers["log_client_update"];

describe("log_client_update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the tool", () => {
    expect(logHandler).toBeDefined();
  });

  it("inserts a manual meeting with correct defaults", async () => {
    vi.mocked(insertManualMeeting).mockResolvedValue({ data: { id: "meeting-1" } });

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await logHandler({
      channel: "phone_call",
      title: "Call with Acme about deadline",
      summary: "Discussed project timeline",
      reported_by: "Stef",
      party_type: "client",
    });
    const text = getText(result);

    expect(insertManualMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Call with Acme about deadline",
        summary: "Discussed project timeline",
        meeting_type: "phone_call",
        party_type: "client",
        participants: ["Stef"],
      }),
    );
    expect(text).toContain("Telefoongesprek gelogd");
    expect(text).toContain("meeting-1");
    expect(text).toContain("draft");
  });

  it("inserts extractions linked to the meeting", async () => {
    vi.mocked(insertManualMeeting).mockResolvedValue({ data: { id: "meeting-2" } });
    vi.mocked(insertExtractions).mockResolvedValue({ count: 2 });

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await logHandler({
      channel: "email",
      title: "Email from client",
      summary: "Client confirmed requirements",
      reported_by: "Wouter",
      party_type: "client",
      extractions: [
        { type: "decision", content: "Go with option A" },
        { type: "action_item", content: "Send proposal", assignee: "Stef", deadline: "2026-04-15" },
      ],
    });
    const text = getText(result);

    expect(insertExtractions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          meeting_id: "meeting-2",
          type: "decision",
          content: "Go with option A",
          confidence: 1.0,
          verification_status: "draft",
        }),
        expect.objectContaining({
          meeting_id: "meeting-2",
          type: "action_item",
          content: "Send proposal",
          metadata: expect.objectContaining({
            assignee: "Stef",
            deadline: "2026-04-15",
            reported_by: "Wouter",
          }),
        }),
      ]),
    );
    expect(text).toContain("E-mail gelogd");
    expect(text).toContain("1 besluit(en)");
    expect(text).toContain("1 actiepunt(en)");
  });

  it("resolves organization ID when organization name matches", async () => {
    vi.mocked(insertManualMeeting).mockResolvedValue({ data: { id: "meeting-3" } });

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [{ id: "org-1" }], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await logHandler({
      channel: "whatsapp",
      title: "WhatsApp met Acme",
      organization_name: "Acme Corp",
      summary: "Quick update",
      reported_by: "Stef",
      party_type: "client",
    });
    const text = getText(result);

    expect(insertManualMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-1",
      }),
    );
    expect(text).toContain("Acme Corp (gekoppeld)");
  });

  it("stores unmatched organization name when not found", async () => {
    vi.mocked(insertManualMeeting).mockResolvedValue({ data: { id: "meeting-4" } });

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await logHandler({
      channel: "chat",
      title: "Chat met New Corp",
      organization_name: "New Corp",
      summary: "First contact",
      reported_by: "Stef",
      party_type: "client",
    });
    const text = getText(result);

    expect(insertManualMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: null,
      }),
    );
    expect(text).toContain("New Corp (niet gevonden in database");
  });

  it("returns error when meeting insertion fails", async () => {
    vi.mocked(insertManualMeeting).mockResolvedValue({ error: "Insert failed" });

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await logHandler({
      channel: "phone_call",
      title: "Failed call",
      summary: "Test",
      reported_by: "Stef",
      party_type: "client",
    });
    const text = getText(result);

    expect(text).toContain("Fout bij aanmaken meeting: Insert failed");
  });

  it("handles extraction insertion failure gracefully", async () => {
    vi.mocked(insertManualMeeting).mockResolvedValue({ data: { id: "meeting-5" } });
    vi.mocked(insertExtractions).mockResolvedValue({ error: "Extraction insert failed" });

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await logHandler({
      channel: "email",
      title: "Email",
      summary: "Summary",
      reported_by: "Stef",
      party_type: "client",
      extractions: [{ type: "decision", content: "Test" }],
    });
    const text = getText(result);

    expect(text).toContain("Meeting aangemaakt, maar fout bij extracties");
    expect(text).toContain("meeting-5");
  });

  it("adds reporter to participants if not already included", async () => {
    vi.mocked(insertManualMeeting).mockResolvedValue({ data: { id: "meeting-6" } });

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    await logHandler({
      channel: "phone_call",
      title: "Call",
      summary: "Summary",
      participants: ["Client Person"],
      reported_by: "Stef",
      party_type: "client",
    });

    expect(insertManualMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        participants: ["Client Person", "Stef"],
      }),
    );
  });

  it("does not duplicate reporter in participants", async () => {
    vi.mocked(insertManualMeeting).mockResolvedValue({ data: { id: "meeting-7" } });

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        organizations: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    await logHandler({
      channel: "phone_call",
      title: "Call",
      summary: "Summary",
      participants: ["Stef", "Wouter"],
      reported_by: "Stef",
      party_type: "client",
    });

    expect(insertManualMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        participants: ["Stef", "Wouter"],
      }),
    );
  });

  it("maps channel types to correct meeting types", async () => {
    const channelMappings: Record<string, string> = {
      phone_call: "phone_call",
      email: "email_update",
      whatsapp: "chat_message",
      chat: "chat_message",
      teams: "chat_message",
      slack: "chat_message",
      other: "other",
    };

    for (const [channel, expectedType] of Object.entries(channelMappings)) {
      vi.mocked(insertManualMeeting).mockResolvedValue({ data: { id: `m-${channel}` } });

      const mockSupabase = createMockSupabase({
        tables: {
          mcp_queries: { data: null, error: null },
          organizations: { data: [], error: null },
        },
      });
      vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

      await logHandler({
        channel,
        title: `${channel} test`,
        summary: "Test",
        reported_by: "Stef",
        party_type: "client",
      });

      expect(insertManualMeeting).toHaveBeenCalledWith(
        expect.objectContaining({
          meeting_type: expectedType,
        }),
      );

      vi.clearAllMocks();
    }
  });
});
