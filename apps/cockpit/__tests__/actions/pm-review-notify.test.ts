import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * CC-002 — verifieert dat de cockpit PM-review server-action de juiste
 * `notifyFeedbackStatusChanged`-call doet ná elke succesvolle mutation.
 *
 * Mock-grens: `@repo/database/mutations/issues`, `@repo/database/mutations/inbox-reads`,
 * `@repo/notifications`, auth + supabase server-client + next/cache.
 */

const mockProfile = {
  value: null as { id: string; role: "admin" | "member" | "client"; email: string } | null,
};
const mockEndorse = vi.fn();
const mockDecline = vi.fn();
const mockDefer = vi.fn();
const mockConvert = vi.fn();
const mockMarkRead = vi.fn();
const mockNotify = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@repo/database/supabase/server", () => ({
  createClient: vi.fn(async () => ({ __mock: "client" })),
}));

vi.mock("@repo/auth/access", () => ({
  getCurrentProfile: vi.fn(async () => mockProfile.value),
}));

vi.mock("@repo/database/mutations/issues", () => ({
  endorseIssue: (...args: unknown[]) => mockEndorse(...args),
  declineIssue: (...args: unknown[]) => mockDecline(...args),
  deferIssue: (...args: unknown[]) => mockDefer(...args),
  convertIssueToQuestion: (...args: unknown[]) => mockConvert(...args),
}));

vi.mock("@repo/database/mutations/inbox-reads", () => ({
  markInboxItemRead: (...args: unknown[]) => mockMarkRead(...args),
}));

vi.mock("@repo/notifications", () => ({
  notifyFeedbackStatusChanged: (...args: unknown[]) => mockNotify(...args),
}));

import { pmReviewAction } from "../../src/features/inbox/actions/pm-review";

const ISSUE_ID = "00000000-0000-4000-8000-000000000001";
const PROFILE_ID = "00000000-0000-4000-8000-000000000010";

const ISSUE_ROW = {
  id: ISSUE_ID,
  project_id: "00000000-0000-4000-8000-000000000020",
  title: "knop",
  client_title: null,
  status: "triage",
  decline_reason: null,
};

beforeEach(() => {
  mockEndorse.mockReset();
  mockDecline.mockReset();
  mockDefer.mockReset();
  mockConvert.mockReset();
  mockMarkRead.mockReset();
  mockNotify.mockReset();
  mockNotify.mockResolvedValue(undefined);
  mockMarkRead.mockResolvedValue({ success: true });
  mockProfile.value = { id: PROFILE_ID, role: "admin", email: "pm@x.nl" };
});

describe("pmReviewAction — endorse", () => {
  it("triggert notifyFeedbackStatusChanged met status `triage`", async () => {
    mockEndorse.mockResolvedValueOnce({ success: true, data: ISSUE_ROW });

    const result = await pmReviewAction({ action: "endorse", issueId: ISSUE_ID });

    expect(result).toEqual({ success: true });
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(ISSUE_ROW, "triage", expect.anything());
  });

  it("notify wordt NIET aangeroepen als mutation faalt", async () => {
    mockEndorse.mockResolvedValueOnce({ error: "Issue niet gevonden" });

    const result = await pmReviewAction({ action: "endorse", issueId: ISSUE_ID });

    expect(result).toEqual({ error: "Issue niet gevonden" });
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe("pmReviewAction — decline / defer / convert", () => {
  it("decline → notify met status `declined`", async () => {
    const declined = { ...ISSUE_ROW, status: "declined", decline_reason: "geen capaciteit" };
    mockDecline.mockResolvedValueOnce({ success: true, data: declined });

    const result = await pmReviewAction({
      action: "decline",
      issueId: ISSUE_ID,
      declineReason: "geen capaciteit",
    });

    expect(result).toEqual({ success: true });
    expect(mockNotify).toHaveBeenCalledWith(declined, "declined", expect.anything());
  });

  it("defer → notify met status `deferred`", async () => {
    const deferred = { ...ISSUE_ROW, status: "deferred" };
    mockDefer.mockResolvedValueOnce({ success: true, data: deferred });

    await pmReviewAction({ action: "defer", issueId: ISSUE_ID });

    expect(mockNotify).toHaveBeenCalledWith(deferred, "deferred", expect.anything());
  });

  it("convert → notify met status `converted_to_qa`", async () => {
    const converted = { ...ISSUE_ROW, status: "converted_to_qa" };
    mockConvert.mockResolvedValueOnce({ success: true, data: converted });

    await pmReviewAction({
      action: "convert",
      issueId: ISSUE_ID,
      questionBody: "wat bedoel je hier precies mee?",
    });

    expect(mockNotify).toHaveBeenCalledWith(converted, "converted_to_qa", expect.anything());
  });
});

describe("pmReviewAction — notify-failure laat action niet falen", () => {
  it("een afwijzing van notify (nooit gebeurd, defensief) crasht de action niet", async () => {
    mockEndorse.mockResolvedValueOnce({ success: true, data: ISSUE_ROW });
    mockNotify.mockRejectedValueOnce(new Error("rete-rete"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await pmReviewAction({ action: "endorse", issueId: ISSUE_ID });

    expect(result).toEqual({ success: true });
    expect(errSpy).toHaveBeenCalled();
  });
});
