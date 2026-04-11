import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/database/mutations/extractions", () => ({
  getExtractionForCorrection: vi.fn(),
  correctExtraction: vi.fn(),
}));

vi.mock("@repo/database/queries/people", () => ({
  findProfileIdByName: vi.fn(),
}));

import { getAdminClient } from "@repo/database/supabase/admin";
import {
  getExtractionForCorrection,
  correctExtraction,
} from "@repo/database/mutations/extractions";
import { findProfileIdByName } from "@repo/database/queries/people";
import { registerCorrectExtractionTools } from "../../src/tools/correct-extraction";
import { createMockSupabase, captureToolHandlers, getText } from "./_helpers";

const handlers = captureToolHandlers(registerCorrectExtractionTools);
const correctHandler = handlers["correct_extraction"];

describe("correct_extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the tool", () => {
    expect(correctHandler).toBeDefined();
  });

  it("fetches extraction via getExtractionForCorrection", async () => {
    const existingExtraction = {
      id: "e1",
      type: "decision",
      content: "Old content",
      metadata: { made_by: "Stef" },
    };

    vi.mocked(getExtractionForCorrection).mockResolvedValue(existingExtraction);
    vi.mocked(correctExtraction).mockResolvedValue({ success: true });
    vi.mocked(findProfileIdByName).mockResolvedValue("profile-1");

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await correctHandler({
      extraction_id: "e1",
      content: "New content",
      corrected_by_name: "Stef",
    });
    const text = getText(result);

    expect(getExtractionForCorrection).toHaveBeenCalledWith("e1");
    expect(text).toContain("Extractie gecorrigeerd");
    expect(text).toContain("Besluit");
    expect(text).toContain("Content bijgewerkt");
  });

  it("executes correction via correctExtraction with resolved profile", async () => {
    const existingExtraction = {
      id: "e1",
      type: "action_item",
      content: "Old action",
      metadata: { assignee: "Wouter" },
    };

    vi.mocked(getExtractionForCorrection).mockResolvedValue(existingExtraction);
    vi.mocked(correctExtraction).mockResolvedValue({ success: true });
    vi.mocked(findProfileIdByName).mockResolvedValue("uid-stef");

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    await correctHandler({
      extraction_id: "e1",
      content: "Updated action",
      metadata: { deadline: "2026-03-01" },
      corrected_by_name: "Stef",
    });

    expect(correctExtraction).toHaveBeenCalledWith(
      "e1",
      expect.objectContaining({
        content: "Updated action",
        corrected_by: "uid-stef",
        metadata: expect.objectContaining({
          assignee: "Wouter",
          deadline: "2026-03-01",
        }),
      }),
    );
  });

  it("resolves corrected_by name to profile ID", async () => {
    vi.mocked(getExtractionForCorrection).mockResolvedValue({
      id: "e1",
      type: "insight",
      content: "test",
      metadata: null,
    });
    vi.mocked(correctExtraction).mockResolvedValue({ success: true });
    vi.mocked(findProfileIdByName).mockResolvedValue("profile-abc");

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await correctHandler({
      extraction_id: "e1",
      content: "corrected",
      corrected_by_name: "Ege",
    });
    const text = getText(result);

    expect(findProfileIdByName).toHaveBeenCalledWith("Ege");
    expect(text).toContain("Gecorrigeerd door:** Ege");
    // Profile was found, so no warning
    expect(text).not.toContain("profiel niet gevonden");
  });

  it("shows warning when corrected_by profile is not found", async () => {
    vi.mocked(getExtractionForCorrection).mockResolvedValue({
      id: "e1",
      type: "need",
      content: "test",
      metadata: null,
    });
    vi.mocked(correctExtraction).mockResolvedValue({ success: true });
    vi.mocked(findProfileIdByName).mockResolvedValue(null);

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await correctHandler({
      extraction_id: "e1",
      content: "corrected",
      corrected_by_name: "Unknown",
    });
    const text = getText(result);

    expect(text).toContain("profiel niet gevonden");
  });

  it("returns error for non-existent extraction", async () => {
    vi.mocked(getExtractionForCorrection).mockResolvedValue(null);

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const nonExistentId = "550e8400-e29b-41d4-a716-446655440000";
    const result = await correctHandler({
      extraction_id: nonExistentId,
      content: "new content",
      corrected_by_name: "Stef",
    });
    const text = getText(result);

    expect(text).toContain(`Extractie ${nonExistentId} niet gevonden`);
  });

  it("returns error when correctExtraction fails", async () => {
    vi.mocked(getExtractionForCorrection).mockResolvedValue({
      id: "e1",
      type: "decision",
      content: "test",
      metadata: null,
    });
    vi.mocked(correctExtraction).mockResolvedValue({ error: "Update failed" });
    vi.mocked(findProfileIdByName).mockResolvedValue("profile-1");

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await correctHandler({
      extraction_id: "e1",
      content: "new",
      corrected_by_name: "Stef",
    });
    const text = getText(result);

    expect(text).toContain("Fout bij bijwerken: Update failed");
  });

  it("merges metadata without overwriting existing fields", async () => {
    vi.mocked(getExtractionForCorrection).mockResolvedValue({
      id: "e1",
      type: "action_item",
      content: "action",
      metadata: { assignee: "Wouter", urgency: "high" },
    });
    vi.mocked(correctExtraction).mockResolvedValue({ success: true });
    vi.mocked(findProfileIdByName).mockResolvedValue("profile-1");

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    await correctHandler({
      extraction_id: "e1",
      metadata: { deadline: "2026-04-01" },
      corrected_by_name: "Stef",
    });

    // Should merge: keep assignee and urgency, add deadline
    expect(correctExtraction).toHaveBeenCalledWith(
      "e1",
      expect.objectContaining({
        metadata: {
          assignee: "Wouter",
          urgency: "high",
          deadline: "2026-04-01",
        },
      }),
    );
  });
});
