import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * CC-006 — Server-action test voor composeMessageToClientAction.
 * Mock-grens: Supabase server-client, auth, mutation, project-lookup,
 * inbox-reads, notifications, next/cache.
 */

const mockProfile = {
  value: null as { id: string; role: "admin" | "member" | "client"; email: string } | null,
};
const mockSendQuestion = vi.fn();
const mockGetProjectOrgId = vi.fn();
const mockMarkRead = vi.fn();
const mockNotify = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@repo/database/supabase/server", () => ({
  createClient: vi.fn(async () => ({ __mock: "client" })),
}));

vi.mock("@repo/auth/access", () => ({
  getCurrentProfile: vi.fn(async () => mockProfile.value),
}));

vi.mock("@repo/database/mutations/client-questions", () => ({
  sendQuestion: (...args: unknown[]) => mockSendQuestion(...args),
}));

vi.mock("@repo/database/queries/projects/lookup", () => ({
  getProjectOrganizationId: (...args: unknown[]) => mockGetProjectOrgId(...args),
}));

vi.mock("@repo/database/mutations/inbox-reads", () => ({
  markInboxItemRead: (...args: unknown[]) => mockMarkRead(...args),
}));

vi.mock("@repo/notifications", () => ({
  notifyNewTeamMessage: (...args: unknown[]) => mockNotify(...args),
}));

import { composeMessageToClientAction } from "../../../../src/features/inbox/actions/compose";

const PROJECT_ID = "00000000-0000-4099-8000-000000000001";
const ORG_ID = "00000000-0000-4099-8000-0000000000aa";
const PROFILE_ID = "00000000-0000-4099-8000-0000000000bb";

beforeEach(() => {
  mockSendQuestion.mockReset();
  mockGetProjectOrgId.mockReset();
  mockMarkRead.mockReset();
  mockNotify.mockReset();
  mockNotify.mockResolvedValue(undefined);
  mockMarkRead.mockResolvedValue({ success: true });
  mockProfile.value = { id: PROFILE_ID, role: "admin", email: "pm@x.nl" };
});

describe("composeMessageToClientAction", () => {
  it("rejecteert ongeldige payload (te-korte body)", async () => {
    const result = await composeMessageToClientAction({ projectId: PROJECT_ID, body: "kort" });
    expect("error" in result).toBe(true);
    expect(mockSendQuestion).not.toHaveBeenCalled();
  });

  it("retourneert 'Niet ingelogd' zonder profiel", async () => {
    mockProfile.value = null;
    const result = await composeMessageToClientAction({
      projectId: PROJECT_ID,
      body: "Een vrij bericht — minimaal tien tekens.",
    });
    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(mockSendQuestion).not.toHaveBeenCalled();
  });

  it("blokkeert klant-rol", async () => {
    mockProfile.value = { id: PROFILE_ID, role: "client", email: "x@y.nl" };
    const result = await composeMessageToClientAction({
      projectId: PROJECT_ID,
      body: "Een vrij bericht — minimaal tien tekens.",
    });
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockSendQuestion).not.toHaveBeenCalled();
  });

  it("retourneert error wanneer project niet bestaat", async () => {
    mockGetProjectOrgId.mockResolvedValue(null);
    const result = await composeMessageToClientAction({
      projectId: PROJECT_ID,
      body: "Een vrij bericht — minimaal tien tekens.",
    });
    expect(result).toEqual({ error: "Project niet gevonden" });
    expect(mockSendQuestion).not.toHaveBeenCalled();
  });

  it("verzendt root-message + markeert read + notifieert klant bij succes", async () => {
    mockGetProjectOrgId.mockResolvedValue(ORG_ID);
    mockSendQuestion.mockResolvedValueOnce({
      success: true,
      data: {
        id: "msg-1",
        project_id: PROJECT_ID,
        body: "Een vrij bericht — minimaal tien tekens.",
      },
    });

    const result = await composeMessageToClientAction({
      projectId: PROJECT_ID,
      body: "Een vrij bericht — minimaal tien tekens.",
    });

    expect(result).toEqual({ success: true, messageId: "msg-1" });
    const [payload, senderProfileId] = mockSendQuestion.mock.calls[0];
    expect(payload).toMatchObject({
      project_id: PROJECT_ID,
      organization_id: ORG_ID,
      body: "Een vrij bericht — minimaal tien tekens.",
    });
    expect(senderProfileId).toBe(PROFILE_ID);

    expect(mockMarkRead).toHaveBeenCalledWith(PROFILE_ID, "question", "msg-1", expect.anything());
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it("propageert mutation-error", async () => {
    mockGetProjectOrgId.mockResolvedValue(ORG_ID);
    mockSendQuestion.mockResolvedValueOnce({ error: "RLS rejected" });

    const result = await composeMessageToClientAction({
      projectId: PROJECT_ID,
      body: "Een vrij bericht — minimaal tien tekens.",
    });

    expect(result).toEqual({ error: "RLS rejected" });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("notify-failure laat action niet falen", async () => {
    mockGetProjectOrgId.mockResolvedValue(ORG_ID);
    mockSendQuestion.mockResolvedValueOnce({
      success: true,
      data: { id: "msg-2", project_id: PROJECT_ID, body: "x".repeat(20) },
    });
    mockNotify.mockRejectedValueOnce(new Error("smtp down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await composeMessageToClientAction({
      projectId: PROJECT_ID,
      body: "Een vrij bericht — minimaal tien tekens.",
    });

    expect(result).toEqual({ success: true, messageId: "msg-2" });
    expect(errSpy).toHaveBeenCalled();
  });
});
