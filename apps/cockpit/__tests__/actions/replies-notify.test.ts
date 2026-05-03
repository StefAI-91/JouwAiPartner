import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * CC-002 — verifieert dat de cockpit replyAsTeamAction `notifyTeamReply`
 * triggert ná een succesvolle reply.
 */

const mockProfile = {
  value: null as { id: string; role: "admin" | "member" | "client"; email: string } | null,
};
const mockReply = vi.fn();
const mockMarkRead = vi.fn();
const mockGetQuestion = vi.fn();
const mockNotify = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@repo/database/supabase/server", () => ({
  createClient: vi.fn(async () => ({ __mock: "client" })),
}));

vi.mock("@repo/auth/access", () => ({
  getCurrentProfile: vi.fn(async () => mockProfile.value),
}));

vi.mock("@repo/database/mutations/client-questions", () => ({
  replyToQuestion: (...args: unknown[]) => mockReply(...args),
}));

vi.mock("@repo/database/queries/client-questions", () => ({
  getQuestionById: (...args: unknown[]) => mockGetQuestion(...args),
}));

vi.mock("@repo/database/mutations/inbox-reads", () => ({
  markInboxItemRead: (...args: unknown[]) => mockMarkRead(...args),
}));

vi.mock("@repo/notifications", () => ({
  notifyTeamReply: (...args: unknown[]) => mockNotify(...args),
}));

import { replyAsTeamAction } from "../../src/features/inbox/actions/replies";

const PROFILE_ID = "00000000-0000-4000-8000-000000000010";
const PARENT_ID = "00000000-0000-4000-8000-000000000100";
const PROJECT_ID = "00000000-0000-4000-8000-000000000020";

const PARENT_ROW = {
  id: PARENT_ID,
  project_id: PROJECT_ID,
  organization_id: "00000000-0000-4000-8000-000000000aaa",
  parent_id: null,
  body: "Wat is de planning?",
};

beforeEach(() => {
  mockReply.mockReset();
  mockMarkRead.mockReset();
  mockGetQuestion.mockReset();
  mockNotify.mockReset();
  mockNotify.mockResolvedValue(undefined);
  mockMarkRead.mockResolvedValue({ success: true });
  mockProfile.value = { id: PROFILE_ID, role: "admin", email: "pm@x.nl" };
});

describe("replyAsTeamAction", () => {
  it("triggert notifyTeamReply met parent + reply-body", async () => {
    mockReply.mockResolvedValueOnce({ success: true, data: { id: "reply-1" } });
    mockGetQuestion.mockResolvedValueOnce(PARENT_ROW);

    const result = await replyAsTeamAction({
      parent_id: PARENT_ID,
      body: "We mikken op vrijdag.",
    });

    expect(result).toEqual({ success: true });
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(PARENT_ROW, "We mikken op vrijdag.", expect.anything());
  });

  it("notify wordt NIET aangeroepen als reply-mutation faalt", async () => {
    mockReply.mockResolvedValueOnce({ error: "iets mis" });

    const result = await replyAsTeamAction({
      parent_id: PARENT_ID,
      body: "x",
    });

    expect(result).toEqual({ error: "iets mis" });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("skipt notify silent als parent-lookup faalt (best-effort)", async () => {
    mockReply.mockResolvedValueOnce({ success: true, data: { id: "reply-1" } });
    mockGetQuestion.mockResolvedValueOnce(null);

    const result = await replyAsTeamAction({
      parent_id: PARENT_ID,
      body: "x",
    });

    expect(result).toEqual({ success: true });
    expect(mockNotify).not.toHaveBeenCalled();
  });
});
