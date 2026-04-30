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

  it("blokkeert profielen zonder portal_project_access", async () => {
    // PR-024: members en clients zonder access-rij worden geblokkeerd door
    // hasPortalProjectAccess (niet meer door een rol-check).
    vi.mocked(getCurrentProfile).mockResolvedValue({
      id: "user-2",
      email: "intern@jouwai.nl",
      role: "member",
    } as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(false);

    const result = await submitFeedback(VALID_INPUT);

    expect(result).toEqual({ error: "Geen toegang tot dit project" });
    expect(hasPortalProjectAccess).toHaveBeenCalled();
  });

  it("PR-024: member met portal_project_access mag feedback submitten", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue({
      id: "user-3",
      email: "stef@jouwai.nl",
      role: "member",
    } as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(true);
    vi.mocked(insertIssue).mockResolvedValue({
      data: { id: "issue-99", issue_number: 99 },
    } as never);

    const result = await submitFeedback(VALID_INPUT);

    expect(result).toEqual({ success: true, issueId: "issue-99", issueNumber: 99 });
    expect(insertIssue).toHaveBeenCalled();
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

  it("PR-021: bug-hint-velden landen in source_metadata, lege strings worden gefilterd", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(CLIENT_PROFILE as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(true);
    vi.mocked(insertIssue).mockResolvedValue({
      data: { id: "issue-2", issue_number: 43 },
    } as never);

    await submitFeedback({
      ...VALID_INPUT,
      source_metadata: {
        browser: "Chrome 120",
        device: "",
        steps_to_reproduce: "1. Login\n2. Klik op X",
        on_behalf_of_user: "  ", // whitespace-only telt als leeg
      },
    });

    const insertedRow = vi.mocked(insertIssue).mock.calls[0][0];
    expect(insertedRow.source_metadata).toMatchObject({
      browser: "Chrome 120",
      steps_to_reproduce: "1. Login\n2. Klik op X",
    });
    // Lege en whitespace-only velden mogen niet in de DB landen.
    expect(insertedRow.source_metadata).not.toHaveProperty("device");
    expect(insertedRow.source_metadata).not.toHaveProperty("on_behalf_of_user");
    // submitted_at blijft toegevoegd door de action.
    expect(insertedRow.source_metadata).toHaveProperty("submitted_at");
  });

  it("PR-021: zonder source_metadata blijft alleen submitted_at over", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(CLIENT_PROFILE as never);
    vi.mocked(hasPortalProjectAccess).mockResolvedValue(true);
    vi.mocked(insertIssue).mockResolvedValue({
      data: { id: "issue-3", issue_number: 44 },
    } as never);

    await submitFeedback(VALID_INPUT);

    const insertedRow = vi.mocked(insertIssue).mock.calls[0][0];
    expect(Object.keys(insertedRow.source_metadata ?? {})).toEqual(["submitted_at"]);
  });
});
