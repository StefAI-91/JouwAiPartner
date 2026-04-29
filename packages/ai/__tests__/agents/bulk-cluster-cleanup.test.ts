import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * PR-019 — Boundary-mocked unit-tests voor de bulk-cluster-cleanup agent.
 * Mocks staan op `ai.generateObject` + Anthropic SDK + run-logger; de agent-
 * code zelf draait. Zo verifiëren we de input-shape die naar de LLM gaat
 * en de doorgegeven output zonder netwerk- of DB-afhankelijkheid.
 */

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "test" })),
}));
vi.mock("../../src/agents/run-logger", () => ({
  withAgentRun: async (_meta: unknown, fn: () => Promise<{ result: unknown; usage?: unknown }>) => {
    const { result } = await fn();
    return result;
  },
}));

import { generateObject } from "ai";
import {
  runBulkClusterCleanup,
  type BulkClusterInput,
} from "../../src/agents/bulk-cluster-cleanup";

const mockGenerateObject = generateObject as unknown as ReturnType<typeof vi.fn>;

const TOPIC_ID = "00000000-0000-4000-8000-000000000020";
const ISSUE_A = "00000000-0000-4000-8000-000000000001";
const ISSUE_B = "00000000-0000-4000-8000-000000000002";

function baseInput(): BulkClusterInput {
  return {
    issues: [
      {
        id: ISSUE_A,
        number: 6,
        title: "Wit scherm na login",
        description: "Bij sommige users blijft het scherm wit",
        ai_classification: { type: "bug", severity: "high" },
      },
      {
        id: ISSUE_B,
        number: 7,
        title: "Wit scherm op refresh",
        description: null,
        ai_classification: null,
      },
    ],
    topics: [
      {
        id: TOPIC_ID,
        title: "Wit scherm",
        description: "Verzameling van wit-scherm reports",
        type: "bug",
        status: "prioritized",
        sampleIssueTitles: ["Wit scherm na uploaden", "Wit scherm bij OAuth-callback"],
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runBulkClusterCleanup — output mapping", () => {
  it("mapt model-output (twee arrays) naar één discriminated-union clusters[]", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        matches: [
          {
            match_topic_id: TOPIC_ID,
            issue_ids: [ISSUE_A],
            rationale: "Past op bestaand topic Wit scherm",
          },
        ],
        new_topics: [
          {
            new_topic: {
              title: "Login redirect-loops",
              description: "Loops bij OAuth callback",
              type: "bug" as const,
            },
            issue_ids: [ISSUE_B],
            rationale: "Geen bestaand topic dekt dit",
          },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    const out = await runBulkClusterCleanup(baseInput());

    expect(out.clusters).toHaveLength(2);
    // Matches komen eerst, dan new_topics — deterministisch.
    expect(out.clusters[0]).toMatchObject({
      kind: "match",
      match_topic_id: TOPIC_ID,
      issue_ids: [ISSUE_A],
    });
    expect(out.clusters[1]).toMatchObject({
      kind: "new",
      issue_ids: [ISSUE_B],
      new_topic: { type: "bug", title: "Login redirect-loops" },
    });
  });

  it("retourneert lege clusters[] als beide arrays leeg zijn", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { matches: [], new_topics: [] },
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    const out = await runBulkClusterCleanup(baseInput());
    expect(out.clusters).toEqual([]);
  });
});

describe("runBulkClusterCleanup — input-shape", () => {
  it("stuurt issues en topics als gestructureerde tekst naar de LLM", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { matches: [], new_topics: [] },
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    await runBulkClusterCleanup(baseInput());

    expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateObject.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const userMsg = callArg.messages.find((m) => m.role === "user");
    expect(userMsg).toBeDefined();
    const userContent = userMsg!.content;

    // Topic verschijnt met id + titel
    expect(userContent).toContain(TOPIC_ID);
    expect(userContent).toContain("Wit scherm");

    // Beide issues verschijnen met hun uuid
    expect(userContent).toContain(ISSUE_A);
    expect(userContent).toContain(ISSUE_B);
    expect(userContent).toContain("#6");
    expect(userContent).toContain("#7");

    // ai_classification velden komen door als platte k=v string
    expect(userContent).toContain("type=bug");
    expect(userContent).toContain("severity=high");
  });

  it("rendert sample-issue-titels per topic onder 'eerder gekoppeld:'", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { matches: [], new_topics: [] },
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    await runBulkClusterCleanup(baseInput());

    const callArg = mockGenerateObject.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const userContent = callArg.messages.find((m) => m.role === "user")!.content;

    expect(userContent).toContain("eerder gekoppeld:");
    expect(userContent).toContain("Wit scherm na uploaden");
    expect(userContent).toContain("Wit scherm bij OAuth-callback");
  });

  it("laat 'eerder gekoppeld:'-blok weg voor topics zonder sample-issues", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { matches: [], new_topics: [] },
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    await runBulkClusterCleanup({
      issues: baseInput().issues,
      topics: [
        {
          id: TOPIC_ID,
          title: "Vers topic",
          description: "Nog geen koppelingen",
          type: "bug",
          status: "clustering",
          sampleIssueTitles: [],
        },
      ],
    });

    const callArg = mockGenerateObject.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const userContent = callArg.messages.find((m) => m.role === "user")!.content;

    expect(userContent).not.toContain("eerder gekoppeld:");
  });

  it("rendert correct met lege topic-lijst", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { matches: [], new_topics: [] },
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    await runBulkClusterCleanup({
      issues: baseInput().issues,
      topics: [],
    });

    const callArg = mockGenerateObject.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const userMsg = callArg.messages.find((m) => m.role === "user");
    expect(userMsg!.content).toContain("geen bestaande open topics");
  });
});

describe("runBulkClusterCleanup — Zod-validatie via SDK", () => {
  it("propageert SDK errors (bv. invalid output) naar de caller", async () => {
    mockGenerateObject.mockRejectedValue(new Error("schema validation failed"));

    await expect(runBulkClusterCleanup(baseInput())).rejects.toThrow(/schema validation/);
  });
});
