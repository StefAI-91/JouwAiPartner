import { describe, it, expect, vi, beforeEach } from "vitest";

// Q3b §5: Portal-app eerste server-action test. Mock alleen de grenzen
// (Supabase server-client + DB-helpers + next/cache).

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

vi.mock("@repo/database/mutations/issues", () => ({
  insertIssue: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@repo/auth/access";
import { hasPortalProjectAccess } from "@repo/database/queries/portal/access";
import { insertIssue } from "@repo/database/mutations/issues";
import { submitFeedback } from "../../src/actions/feedback";

const VALID_INPUT = {
  project_id: "00000000-0000-4000-8000-000000000001",
  title: "Login werkt niet op mobiel",
  description: "Ik zie een foutmelding na inloggen — duidelijke beschrijving van het probleem.",
  type: "bug" as const,
};

const CLIENT_PROFILE = { id: "user-1", email: "klant@acme.nl", role: "client" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("submitFeedback", () => {
  it("retourneert error wanneer Zod-schema faalt", async () => {
    const result = await submitFeedback({ project_id: "not-uuid" });

    expect("error" in result).toBe(true);
    expect((result as { fieldErrors: unknown }).fieldErrors).toBeDefined();
    expect(insertIssue).not.toHaveBeenCalled();
  });

  it("blokkeert non-client/non-admin profielen", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue({
      id: "user-2",
      email: "intern@jouwai.nl",
      role: "member",
    } as never);

    const result = await submitFeedback(VALID_INPUT);

    expect(result).toEqual({ error: "Geen toegang tot het portaal" });
    expect(hasPortalProjectAccess).not.toHaveBeenCalled();
  });

  it("inserts issue met source='portal' en revalidate paths", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(CLIENT_PROFILE as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(true);
    vi.mocked(insertIssue).mockResolvedValue({
      data: { id: "issue-1", issue_number: 42 },
    } as never);

    const result = await submitFeedback(VALID_INPUT);

    expect(result).toEqual({ success: true, issueId: "issue-1", issueNumber: 42 });
    const insertedRow = vi.mocked(insertIssue).mock.calls[0][0];
    expect(insertedRow.source).toBe("portal");
    expect(insertedRow.reporter_email).toBe("klant@acme.nl");
    expect(insertedRow.status).toBe("triage");
    expect(vi.mocked(revalidatePath).mock.calls.flat()).toContain(
      `/projects/${VALID_INPUT.project_id}`,
    );
  });
});
