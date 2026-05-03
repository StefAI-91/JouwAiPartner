import { describe, it, expect, vi, beforeEach } from "vitest";

// PR-023 — DevHub questions Server Actions. Mock-grens: auth helpers,
// mutations en next/cache. `createPageClient` levert een minimale fake-client
// die het `projects.select().eq().maybeSingle()`-pad afdekt dat
// `getProjectOrganizationId` (gebruikt door askQuestionAction) aanroept.

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@repo/database/mutations/client-questions", () => ({
  sendQuestion: vi.fn(),
  replyToQuestion: vi.fn(),
}));

const mockProjectOrg = vi.fn();
vi.mock("@repo/auth/helpers", () => ({
  getAuthenticatedUser: vi.fn(),
  createPageClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table !== "projects") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => mockProjectOrg(),
          }),
        }),
      };
    },
  })),
}));

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { sendQuestion, replyToQuestion } from "@repo/database/mutations/client-questions";
import { askQuestionAction, replyAsTeamAction } from "@/features/questions/actions/questions";

const PROJECT_ID = "00000000-0000-4023-8000-000000000010";
const ORG_ID = "00000000-0000-4023-8000-0000000000a0";
const TOPIC_ID = "00000000-0000-4023-8000-0000000000b0";
const PARENT_ID = "00000000-0000-4023-8000-0000000000c0";
const TEAM_USER = { id: "team-user-1", email: "stef@jouwai.nl" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("askQuestionAction", () => {
  it("retourneert 'Niet ingelogd' zonder user", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const result = await askQuestionAction({
      project_id: PROJECT_ID,
      body: "Een lange vraag van minimaal 10 tekens",
    });

    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(sendQuestion).not.toHaveBeenCalled();
  });

  it("retourneert error wanneer body te kort is (Zod)", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(TEAM_USER as never);

    const result = await askQuestionAction({
      project_id: PROJECT_ID,
      body: "kort",
    });

    expect("error" in result).toBe(true);
    expect(sendQuestion).not.toHaveBeenCalled();
  });

  it("faalt wanneer project geen organization_id heeft", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(TEAM_USER as never);
    mockProjectOrg.mockResolvedValue({ data: { organization_id: null }, error: null });

    const result = await askQuestionAction({
      project_id: PROJECT_ID,
      body: "Een lange vraag van minimaal 10 tekens",
    });

    expect(result).toEqual({ error: "Project of organisatie niet gevonden" });
    expect(sendQuestion).not.toHaveBeenCalled();
  });

  it("roept sendQuestion met afgeleide org en revalideert topic-pad", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(TEAM_USER as never);
    mockProjectOrg.mockResolvedValue({
      data: { organization_id: ORG_ID },
      error: null,
    });
    vi.mocked(sendQuestion).mockResolvedValue({
      success: true,
      data: { id: "q-1" },
    } as never);

    const result = await askQuestionAction({
      project_id: PROJECT_ID,
      body: "Kunnen jullie de logo's in SVG aanleveren?",
      topic_id: TOPIC_ID,
    });

    expect(result).toEqual({ success: true });

    const [payload, senderId] = vi.mocked(sendQuestion).mock.calls[0];
    expect(payload).toMatchObject({
      project_id: PROJECT_ID,
      organization_id: ORG_ID,
      body: "Kunnen jullie de logo's in SVG aanleveren?",
      topic_id: TOPIC_ID,
      issue_id: null,
    });
    expect(senderId).toBe(TEAM_USER.id);

    expect(vi.mocked(revalidatePath).mock.calls.map((c) => c[0])).toContain(`/topics/${TOPIC_ID}`);
  });

  it("propageert mutation-error", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(TEAM_USER as never);
    mockProjectOrg.mockResolvedValue({
      data: { organization_id: ORG_ID },
      error: null,
    });
    vi.mocked(sendQuestion).mockResolvedValue({ error: "DB exploded" } as never);

    const result = await askQuestionAction({
      project_id: PROJECT_ID,
      body: "Een lange vraag van minimaal 10 tekens",
    });

    expect(result).toEqual({ error: "DB exploded" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("replyAsTeamAction", () => {
  it("retourneert 'Niet ingelogd' zonder user", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const result = await replyAsTeamAction({ parent_id: PARENT_ID, body: "Hi" });

    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(replyToQuestion).not.toHaveBeenCalled();
  });

  it("roept replyToQuestion met role='team' en revalideert layouts", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(TEAM_USER as never);
    vi.mocked(replyToQuestion).mockResolvedValue({
      success: true,
      data: { id: "reply-1" },
    } as never);

    const result = await replyAsTeamAction({ parent_id: PARENT_ID, body: "Reactie van team." });

    expect(result).toEqual({ success: true });

    const [, sender] = vi.mocked(replyToQuestion).mock.calls[0];
    expect(sender).toEqual({ profile_id: TEAM_USER.id, role: "team" });

    const revalidated = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    expect(revalidated).toContain("/topics");
    expect(revalidated).toContain("/issues");
  });
});
