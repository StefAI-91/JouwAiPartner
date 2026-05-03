import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * CC-007 — markInboxItemReadAction unit-test.
 *
 * Bewijst:
 *   - alle drie de UI-kinds (`issue`, `feedback`, `question`) worden
 *     geaccepteerd door het Zod-schema,
 *   - `feedback` wordt naar `issue` gemapt vóór de DB-call (kolom kent
 *     enkel `issue` of `question`),
 *   - klant-rol wordt geweigerd.
 */

const mockProfile = {
  value: null as { id: string; role: "admin" | "member" | "client" } | null,
};
const mockMarkInboxItemRead = vi.fn();

vi.mock("@repo/database/supabase/server", () => ({
  createClient: vi.fn(async () => ({ __mock: "client" })),
}));

vi.mock("@repo/auth/access", () => ({
  getCurrentProfile: vi.fn(async () => mockProfile.value),
}));

vi.mock("@repo/database/mutations/inbox-reads", () => ({
  markInboxItemRead: (...args: unknown[]) => mockMarkInboxItemRead(...args),
}));

import { markInboxItemReadAction } from "../../../../src/features/inbox/actions/mark-read";

const PROFILE_ID = "00000000-0000-4099-8000-000000000001";
const ITEM_ID = "00000000-0000-4099-8000-000000000010";

beforeEach(() => {
  mockMarkInboxItemRead.mockReset();
  mockMarkInboxItemRead.mockResolvedValue({ success: true });
  mockProfile.value = { id: PROFILE_ID, role: "admin" };
});

describe("markInboxItemReadAction", () => {
  it("accepteert kind=issue en stuurt 'issue' naar de mutation", async () => {
    const result = await markInboxItemReadAction({ kind: "issue", itemId: ITEM_ID });
    expect(result).toEqual({ success: true });
    const [profileId, kind, itemId] = mockMarkInboxItemRead.mock.calls[0]!;
    expect(profileId).toBe(PROFILE_ID);
    expect(kind).toBe("issue");
    expect(itemId).toBe(ITEM_ID);
  });

  it("accepteert kind=question en stuurt 'question' naar de mutation", async () => {
    await markInboxItemReadAction({ kind: "question", itemId: ITEM_ID });
    const [, kind] = mockMarkInboxItemRead.mock.calls[0]!;
    expect(kind).toBe("question");
  });

  it("accepteert kind=feedback (UI-waarde) en mapt naar 'issue' voor de DB", async () => {
    const result = await markInboxItemReadAction({ kind: "feedback", itemId: ITEM_ID });
    expect(result).toEqual({ success: true });
    const [, kind] = mockMarkInboxItemRead.mock.calls[0]!;
    expect(kind).toBe("issue");
  });

  it("rejecteert onbekende kind-waardes via Zod", async () => {
    const result = await markInboxItemReadAction({ kind: "topic", itemId: ITEM_ID });
    expect("error" in result).toBe(true);
    expect(mockMarkInboxItemRead).not.toHaveBeenCalled();
  });

  it("blokkeert klant-rol vóór de DB-call", async () => {
    mockProfile.value = { id: PROFILE_ID, role: "client" };
    const result = await markInboxItemReadAction({ kind: "feedback", itemId: ITEM_ID });
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockMarkInboxItemRead).not.toHaveBeenCalled();
  });
});
