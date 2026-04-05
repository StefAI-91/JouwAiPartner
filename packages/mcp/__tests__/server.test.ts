import { describe, it, expect, vi } from "vitest";

// Mock external dependencies that tool files import at module level
vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({})),
}));

vi.mock("@repo/ai/embeddings", () => ({
  embedText: vi.fn(async () => []),
}));

vi.mock("@repo/database/queries/people", () => ({
  findPersonIdsByName: vi.fn(async () => []),
  findProfileIdByName: vi.fn(async () => null),
}));

vi.mock("@repo/database/mutations/extractions", () => ({
  getExtractionForCorrection: vi.fn(async () => null),
  correctExtraction: vi.fn(async () => ({ success: true })),
  deleteExtractionsByMeetingId: vi.fn(async () => ({ success: true })),
}));

import { createMcpServer } from "../src/server";

const EXPECTED_TOOLS = [
  "search_knowledge",
  "get_meeting_summary",
  "get_tasks",
  "get_action_items",
  "get_decisions",
  "get_organizations",
  "get_projects",
  "get_people",
  "get_organization_overview",
  "list_meetings",
  "correct_extraction",
];

describe("createMcpServer", () => {
  it("returns a McpServer instance without errors", () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
  });

  it("has correct server metadata", () => {
    const server = createMcpServer();
    // Access internal server info
    const internal = (server as Record<string, unknown>).server as Record<string, unknown>;
    const serverInfo = internal?._serverInfo as { name: string; version: string } | undefined;

    if (serverInfo) {
      expect(serverInfo.name).toBe("jouwaipartner-knowledge");
      expect(serverInfo.version).toBe("1.0.0");
    }
  });

  it("registers all 11 expected tools", () => {
    const server = createMcpServer();
    // Access internal _registeredTools map
    const registeredTools = (server as Record<string, unknown>)._registeredTools as Map<string, unknown> | Record<string, unknown>;

    let toolNames: string[];
    if (registeredTools instanceof Map) {
      toolNames = Array.from(registeredTools.keys());
    } else {
      toolNames = Object.keys(registeredTools ?? {});
    }

    expect(toolNames).toHaveLength(EXPECTED_TOOLS.length);
    for (const expectedTool of EXPECTED_TOOLS) {
      expect(toolNames).toContain(expectedTool);
    }
  });

  it("registers the kennisbasis-context prompt", () => {
    const server = createMcpServer();
    const registeredPrompts = (server as Record<string, unknown>)._registeredPrompts as Map<string, unknown> | Record<string, unknown>;

    let promptNames: string[];
    if (registeredPrompts instanceof Map) {
      promptNames = Array.from(registeredPrompts.keys());
    } else {
      promptNames = Object.keys(registeredPrompts ?? {});
    }

    expect(promptNames).toContain("kennisbasis-context");
  });
});
