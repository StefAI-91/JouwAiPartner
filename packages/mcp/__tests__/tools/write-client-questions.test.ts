import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// PR-025 — Tests volgen het bestaande MCP write-tool-patroon: mock
// `@repo/database/mutations/*` en `@repo/database/queries/*` (dezelfde stijl
// als write-client-updates.test.ts). De Supabase-client wordt via een fake
// gemockt voor de project-resolutie en usage-tracking.
//
// CLAUDE.md §Tests waarschuwt voor het mocken van interne queries; we volgen
// hier bewust het patroon dat write-client-updates al hanteert om
// stijl-consistentie binnen de MCP test-suite te bewaren. Een suite-brede
// refactor naar een echte boundary-mock is een eigen sprint waard.

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/database/mutations/client-questions", () => ({
  sendQuestion: vi.fn(),
}));

vi.mock("@repo/database/queries/people", () => ({
  findProfileIdByName: vi.fn(),
}));

vi.mock("@repo/database/queries/team", () => ({
  getProfileRole: vi.fn(),
}));

import { getAdminClient } from "@repo/database/supabase/admin";
import { sendQuestion } from "@repo/database/mutations/client-questions";
import { findProfileIdByName } from "@repo/database/queries/people";
import { getProfileRole } from "@repo/database/queries/team";
import { registerWriteClientQuestionTools } from "../../src/tools/write-client-questions";
import { captureToolHandlers, getText } from "./_helpers";

const handlers = captureToolHandlers(registerWriteClientQuestionTools);
const askHandler = handlers["ask_client_question"];

const SENDER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ORG_ID = "33333333-3333-4333-8333-333333333333";
const QUESTION_ID = "44444444-4444-4444-8444-444444444444";

/**
 * Bouw een minimale Supabase-fake die alleen de calls afdekt die deze tool
 * doet: `from('mcp_queries').insert(...)` (tracking, fire-and-forget) en
 * `from('projects').select(...).eq('id', ...).maybeSingle()` voor UUID-pad,
 * plus `from('organizations')` en `from('projects').or(...).limit()` voor
 * naam-pad. Eén `from()` per aanroep zodat we per test de respons kunnen
 * sturen.
 */
function makeSupabaseFake(
  opts: {
    projectById?: { data: unknown; error: unknown };
    orgsByName?: { data: unknown; error: unknown };
    projectsByOrg?: { data: unknown; error: unknown };
  } = {},
) {
  return {
    from: vi.fn((table: string) => {
      if (table === "mcp_queries") {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue(opts.projectById ?? { data: null, error: null }),
            })),
            in: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue(opts.projectsByOrg ?? { data: [], error: null }),
              })),
            })),
          })),
        };
      }
      if (table === "organizations") {
        return {
          select: vi.fn(() => ({
            or: vi.fn().mockResolvedValue(opts.orgsByName ?? { data: [], error: null }),
          })),
        };
      }
      throw new Error(`Unexpected table in test fake: ${table}`);
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findProfileIdByName).mockResolvedValue(SENDER_ID);
  vi.mocked(getProfileRole).mockResolvedValue("member");
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_PORTAL_URL;
});

describe("ask_client_question", () => {
  it("registreert de tool", () => {
    expect(askHandler).toBeDefined();
  });

  it("happy path: project_id + asked_by_name → sendQuestion krijgt afgeleide org + sender", async () => {
    const fake = makeSupabaseFake({
      projectById: {
        data: {
          id: PROJECT_ID,
          name: "Demo",
          organization_id: ORG_ID,
          organizations: { name: "Acme Corp" },
        },
        error: null,
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(fake as never);
    vi.mocked(sendQuestion).mockResolvedValue({
      success: true,
      data: { id: QUESTION_ID } as never,
    });

    const result = await askHandler({
      project_id: PROJECT_ID,
      asked_by_name: "Stef",
      body: "Welk datum-format willen jullie in de export?",
    });
    const text = getText(result);

    expect(findProfileIdByName).toHaveBeenCalledWith("Stef");
    expect(sendQuestion).toHaveBeenCalledTimes(1);
    const [payload, senderId] = vi.mocked(sendQuestion).mock.calls[0];
    expect(payload).toMatchObject({
      project_id: PROJECT_ID,
      organization_id: ORG_ID,
      body: "Welk datum-format willen jullie in de export?",
      due_date: null,
      topic_id: null,
      issue_id: null,
    });
    expect(senderId).toBe(SENDER_ID);
    expect(text).toContain("Vraag geplaatst in portal-inbox");
    expect(text).toContain(QUESTION_ID);
    expect(text).toContain("Demo (Acme Corp)");
    expect(text).toContain("Stef");
  });

  it("naam-pad: organization_name + project_name resolve via fuzzy match", async () => {
    const fake = makeSupabaseFake({
      orgsByName: { data: [{ id: ORG_ID }], error: null },
      projectsByOrg: {
        data: [
          {
            id: PROJECT_ID,
            name: "Knowledge Platform",
            organization_id: ORG_ID,
            organizations: { name: "Acme Corp" },
          },
        ],
        error: null,
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(fake as never);
    vi.mocked(sendQuestion).mockResolvedValue({
      success: true,
      data: { id: QUESTION_ID } as never,
    });

    const result = await askHandler({
      organization_name: "Acme",
      project_name: "Knowledge",
      asked_by_name: "Wouter",
      body: "Mogen we de oude logo's weghalen uit de footer?",
    });
    const text = getText(result);

    expect(sendQuestion).toHaveBeenCalledTimes(1);
    const [payload] = vi.mocked(sendQuestion).mock.calls[0];
    expect(payload).toMatchObject({
      project_id: PROJECT_ID,
      organization_id: ORG_ID,
    });
    expect(text).toContain("Knowledge Platform (Acme Corp)");
  });

  it("naam-pad faalt wanneer er meerdere matches zijn", async () => {
    const fake = makeSupabaseFake({
      orgsByName: { data: [{ id: ORG_ID }], error: null },
      projectsByOrg: {
        data: [
          { id: "p1", name: "Demo", organization_id: ORG_ID, organizations: { name: "Acme" } },
          { id: "p2", name: "Demo v2", organization_id: ORG_ID, organizations: { name: "Acme" } },
        ],
        error: null,
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(fake as never);

    const result = await askHandler({
      organization_name: "Acme",
      project_name: "Demo",
      asked_by_name: "Stef",
      body: "Een vraag van minimaal 10 tekens.",
    });
    const text = getText(result);

    expect(sendQuestion).not.toHaveBeenCalled();
    expect(text).toContain("Meerdere projecten matchen");
    expect(text).toContain("project_id");
  });

  it("onbekende asked_by_name → heldere foutmelding, geen sendQuestion", async () => {
    vi.mocked(findProfileIdByName).mockResolvedValue(null);
    const fake = makeSupabaseFake();
    vi.mocked(getAdminClient).mockReturnValue(fake as never);

    const result = await askHandler({
      project_id: PROJECT_ID,
      asked_by_name: "Onbekend Persoon",
      body: "Een geldige vraag van minimaal 10 tekens.",
    });
    const text = getText(result);

    expect(sendQuestion).not.toHaveBeenCalled();
    expect(text).toContain('Geen team-profiel gevonden voor "Onbekend Persoon"');
  });

  it("asked_by_name resolves naar client-rol → afgewezen voor RLS faalt", async () => {
    vi.mocked(getProfileRole).mockResolvedValue("client");
    const fake = makeSupabaseFake();
    vi.mocked(getAdminClient).mockReturnValue(fake as never);

    const result = await askHandler({
      project_id: PROJECT_ID,
      asked_by_name: "Klant Persoon",
      body: "Een geldige vraag van minimaal 10 tekens.",
    });
    const text = getText(result);

    expect(sendQuestion).not.toHaveBeenCalled();
    expect(text).toContain("geen team-rol");
    expect(text).toContain("role=client");
  });

  it("due_date YYYY-MM-DD wordt geconverteerd naar ISO datetime voor de mutation", async () => {
    const fake = makeSupabaseFake({
      projectById: {
        data: {
          id: PROJECT_ID,
          name: "Demo",
          organization_id: ORG_ID,
          organizations: { name: "Acme" },
        },
        error: null,
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(fake as never);
    vi.mocked(sendQuestion).mockResolvedValue({
      success: true,
      data: { id: QUESTION_ID } as never,
    });

    await askHandler({
      project_id: PROJECT_ID,
      asked_by_name: "Stef",
      body: "Vraag met deadline van minimaal 10 tekens.",
      due_date: "2026-05-15",
    });

    const [payload] = vi.mocked(sendQuestion).mock.calls[0];
    expect(payload).toMatchObject({ due_date: "2026-05-15T23:59:59.000Z" });
  });

  it("portal_url respecteert NEXT_PUBLIC_PORTAL_URL", async () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.example.com";
    const fake = makeSupabaseFake({
      projectById: {
        data: {
          id: PROJECT_ID,
          name: "Demo",
          organization_id: ORG_ID,
          organizations: { name: "Acme" },
        },
        error: null,
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(fake as never);
    vi.mocked(sendQuestion).mockResolvedValue({
      success: true,
      data: { id: QUESTION_ID } as never,
    });

    const result = await askHandler({
      project_id: PROJECT_ID,
      asked_by_name: "Stef",
      body: "Een vraag van minimaal 10 tekens.",
    });
    const text = getText(result);

    expect(text).toContain(`https://portal.example.com/projects/${PROJECT_ID}/inbox`);
  });

  it("project_id voor onbekend project → foutmelding zonder sendQuestion", async () => {
    const fake = makeSupabaseFake({
      projectById: { data: null, error: null },
    });
    vi.mocked(getAdminClient).mockReturnValue(fake as never);

    const result = await askHandler({
      project_id: PROJECT_ID,
      asked_by_name: "Stef",
      body: "Een vraag van minimaal 10 tekens.",
    });
    const text = getText(result);

    expect(sendQuestion).not.toHaveBeenCalled();
    expect(text).toContain("niet gevonden");
  });

  it("propageert sendQuestion-fout naar de tool-output", async () => {
    const fake = makeSupabaseFake({
      projectById: {
        data: {
          id: PROJECT_ID,
          name: "Demo",
          organization_id: ORG_ID,
          organizations: { name: "Acme" },
        },
        error: null,
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(fake as never);
    vi.mocked(sendQuestion).mockResolvedValue({ error: "DB exploded" });

    const result = await askHandler({
      project_id: PROJECT_ID,
      asked_by_name: "Stef",
      body: "Een vraag van minimaal 10 tekens.",
    });
    const text = getText(result);

    expect(text).toContain("Fout bij plaatsen vraag: DB exploded");
  });
});
