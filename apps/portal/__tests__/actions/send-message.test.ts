import { describe, it, expect, vi, beforeEach } from "vitest";

// CC-006 — Server-action test voor sendMessageAsClientAction.
// Mock-grens: Supabase client + auth + portal-access + mutation + project-lookup + next/cache.

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@repo/database/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@repo/auth/access", () => ({
  getCurrentProfile: vi.fn(),
}));

vi.mock("@repo/database/queries/portal/access", () => ({
  hasPortalProjectAccess: vi.fn(),
}));

vi.mock("@repo/database/queries/projects/lookup", () => ({
  getProjectOrganizationId: vi.fn(),
}));

vi.mock("@repo/database/mutations/client-questions", () => ({
  sendQuestion: vi.fn(),
  replyToQuestion: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@repo/auth/access";
import { hasPortalProjectAccess } from "@repo/database/queries/portal/access";
import { getProjectOrganizationId } from "@repo/database/queries/projects/lookup";
import { sendQuestion } from "@repo/database/mutations/client-questions";
import { sendMessageAsClientAction } from "../../src/actions/inbox";

const PROJECT_ID = "00000000-0000-4099-8000-000000000001";
const ORG_ID = "00000000-0000-4099-8000-0000000000aa";

const CLIENT_PROFILE = {
  id: "client-user-1",
  email: "klant@acme.nl",
  role: "client" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendMessageAsClientAction", () => {
  it("retourneert error wanneer body te kort is", async () => {
    const result = await sendMessageAsClientAction(PROJECT_ID, { body: "kort" });

    expect("error" in result).toBe(true);
    expect(sendQuestion).not.toHaveBeenCalled();
  });

  it("retourneert 'Niet ingelogd' zonder profiel", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(null);

    const result = await sendMessageAsClientAction(PROJECT_ID, {
      body: "Een vrij bericht aan team — minimaal tien.",
    });

    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(sendQuestion).not.toHaveBeenCalled();
  });

  it("blokkeert wanneer hasPortalProjectAccess false is", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(CLIENT_PROFILE as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(false);

    const result = await sendMessageAsClientAction(PROJECT_ID, {
      body: "Een vrij bericht aan team — minimaal tien.",
    });

    expect(result).toEqual({ error: "Geen toegang tot dit project" });
    expect(sendQuestion).not.toHaveBeenCalled();
  });

  it("retourneert error wanneer project-org-lookup faalt", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(CLIENT_PROFILE as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(true);
    vi.mocked(getProjectOrganizationId).mockResolvedValue(null);

    const result = await sendMessageAsClientAction(PROJECT_ID, {
      body: "Een vrij bericht aan team — minimaal tien.",
    });

    expect(result).toEqual({ error: "Project niet gevonden" });
    expect(sendQuestion).not.toHaveBeenCalled();
  });

  it("verzendt root-bericht en revalideert beide paden bij succes", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(CLIENT_PROFILE as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(true);
    vi.mocked(getProjectOrganizationId).mockResolvedValue(ORG_ID);
    vi.mocked(sendQuestion).mockResolvedValue({
      success: true,
      data: { id: "msg-1", project_id: PROJECT_ID },
    } as never);

    const result = await sendMessageAsClientAction(PROJECT_ID, {
      body: "Een vrij bericht aan team — minimaal tien.",
    });

    expect(result).toEqual({ success: true, messageId: "msg-1" });

    const [payload, senderProfileId] = vi.mocked(sendQuestion).mock.calls[0];
    expect(payload).toMatchObject({
      project_id: PROJECT_ID,
      organization_id: ORG_ID,
      body: "Een vrij bericht aan team — minimaal tien.",
    });
    expect(senderProfileId).toBe(CLIENT_PROFILE.id);

    const revalidated = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    expect(revalidated).toContain(`/projects/${PROJECT_ID}/inbox`);
    expect(revalidated).toContain(`/projects/${PROJECT_ID}`);
  });

  it("propageert mutation-error", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(CLIENT_PROFILE as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(true);
    vi.mocked(getProjectOrganizationId).mockResolvedValue(ORG_ID);
    vi.mocked(sendQuestion).mockResolvedValue({
      error: "RLS rejected",
    } as never);

    const result = await sendMessageAsClientAction(PROJECT_ID, {
      body: "Een vrij bericht aan team — minimaal tien.",
    });

    expect(result).toEqual({ error: "RLS rejected" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
