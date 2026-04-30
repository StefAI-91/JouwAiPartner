import { describe, it, expect, vi, beforeEach } from "vitest";

// PR-023 — Server-action test voor replyAsClientAction.
// Mock-grens: Supabase client + auth + portal-access + mutation + next/cache.

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

vi.mock("@repo/database/mutations/client-questions", () => ({
  replyToQuestion: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@repo/auth/access";
import { hasPortalProjectAccess } from "@repo/database/queries/portal/access";
import { replyToQuestion } from "@repo/database/mutations/client-questions";
import { replyAsClientAction } from "../../src/actions/inbox";

const PROJECT_ID = "00000000-0000-4023-8000-000000000001";
const PARENT_ID = "00000000-0000-4023-8000-0000000000aa";

const CLIENT_PROFILE = {
  id: "client-user-1",
  email: "klant@acme.nl",
  role: "client" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("replyAsClientAction", () => {
  it("retourneert error wanneer Zod-validatie faalt", async () => {
    const result = await replyAsClientAction(PROJECT_ID, { parent_id: "not-uuid", body: "" });

    expect("error" in result).toBe(true);
    expect(replyToQuestion).not.toHaveBeenCalled();
  });

  it("retourneert 'Niet ingelogd' zonder profiel", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(null);

    const result = await replyAsClientAction(PROJECT_ID, {
      parent_id: PARENT_ID,
      body: "Antwoord",
    });

    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(replyToQuestion).not.toHaveBeenCalled();
  });

  it("blokkeert wanneer hasPortalProjectAccess false retourneert", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(CLIENT_PROFILE as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(false);

    const result = await replyAsClientAction(PROJECT_ID, {
      parent_id: PARENT_ID,
      body: "Antwoord",
    });

    expect(result).toEqual({ error: "Geen toegang tot dit project" });
    expect(replyToQuestion).not.toHaveBeenCalled();
  });

  it("roept replyToQuestion met role='client' en revalideert beide paden", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(CLIENT_PROFILE as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(true);
    vi.mocked(replyToQuestion).mockResolvedValue({
      success: true,
      data: { id: "reply-1" },
    } as never);

    const result = await replyAsClientAction(PROJECT_ID, {
      parent_id: PARENT_ID,
      body: "Hier is mijn antwoord.",
    });

    expect(result).toEqual({ success: true });

    const [payload, sender] = vi.mocked(replyToQuestion).mock.calls[0];
    expect(payload).toEqual({
      parent_id: PARENT_ID,
      body: "Hier is mijn antwoord.",
    });
    expect(sender).toEqual({ profile_id: CLIENT_PROFILE.id, role: "client" });

    const revalidated = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    expect(revalidated).toContain(`/projects/${PROJECT_ID}/inbox`);
    expect(revalidated).toContain(`/projects/${PROJECT_ID}`);
  });

  it("propageert mutation-error", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(CLIENT_PROFILE as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(true);
    vi.mocked(replyToQuestion).mockResolvedValue({
      error: "parent question not found",
    } as never);

    const result = await replyAsClientAction(PROJECT_ID, {
      parent_id: PARENT_ID,
      body: "Antwoord",
    });

    expect(result).toEqual({ error: "parent question not found" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
