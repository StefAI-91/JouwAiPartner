import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * CC-002 — verifieert dat updateIssueAction `notifyFeedbackStatusChanged`
 * alleen triggert bij transitie naar `in_progress` of `done`, niet bij andere
 * status-changes.
 *
 * Mock-grens: alle collaborators (queries, mutations, slack, notify, auth,
 * next/cache). Geen DB.
 */

const mockUser = { value: null as { id: string } | null };
const mockUpdateIssue = vi.fn();
const mockGetIssueById = vi.fn();
const mockInsertActivity = vi.fn();
const mockGetProfileNameById = vi.fn();
const mockAssertProjectAccess = vi.fn();
const mockNotifySlack = vi.fn();
const mockResolveSlackEvent = vi.fn();
const mockNotify = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@repo/auth/helpers", () => ({
  getAuthenticatedUser: vi.fn(async () => mockUser.value),
}));

vi.mock("@repo/auth/access", () => ({
  assertProjectAccess: (...args: unknown[]) => mockAssertProjectAccess(...args),
  NotAuthorizedError: class NotAuthorizedError extends Error {},
}));

vi.mock("@repo/database/mutations/issues", () => ({
  insertIssue: vi.fn(),
  updateIssue: (...args: unknown[]) => mockUpdateIssue(...args),
  deleteIssue: vi.fn(),
  insertActivity: (...args: unknown[]) => mockInsertActivity(...args),
}));

vi.mock("@repo/database/queries/issues", () => ({
  getIssueById: (...args: unknown[]) => mockGetIssueById(...args),
  getIssueCounts: vi.fn(),
}));

vi.mock("@repo/database/queries/team", () => ({
  getProfileNameById: (...args: unknown[]) => mockGetProfileNameById(...args),
}));

vi.mock("@repo/database/integrations/slack", () => ({
  resolveSlackEvent: (...args: unknown[]) => mockResolveSlackEvent(...args),
  notifySlackIfUrgent: (...args: unknown[]) => mockNotifySlack(...args),
}));

vi.mock("@repo/notifications", () => ({
  notifyFeedbackStatusChanged: (...args: unknown[]) => mockNotify(...args),
  // CC-007 — DevHub gebruikt `pickTemplateForStatus` om te beslissen of er
  // een mail moet. Hier mocken we het naar de echte waarheid: alle statussen
  // met een template returnen { template, tag }, zonder template returnen
  // ze null. De test gebruikt een minimale lookup-tabel die de productie-
  // mapping spiegelt.
  pickTemplateForStatus: (status: string) => {
    const TRIGGERS = new Set([
      "triage",
      "declined",
      "deferred",
      "converted_to_qa",
      "in_progress",
      "done",
    ]);
    return TRIGGERS.has(status) ? { template: () => ({}), tag: `feedback-${status}` } : null;
  },
}));

vi.mock("@repo/database/supabase/server", () => ({
  createClient: vi.fn(async () => ({ __mock: "cookie-client" })),
}));

vi.mock("@/features/issues/actions/classify", () => ({
  classifyIssueBackground: vi.fn(),
}));

import { updateIssueAction } from "@/features/issues/actions/issues";

const ISSUE_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000020";
const USER_ID = "00000000-0000-4000-8000-000000000010";

const BASE_ISSUE = {
  id: ISSUE_ID,
  project_id: PROJECT_ID,
  title: "Knop werkt niet",
  client_title: null,
  status: "triage",
  priority: "medium",
  type: "bug",
  component: null,
  severity: null,
  assigned_to: null,
  assigned_person: null,
  labels: [],
  decline_reason: null,
};

beforeEach(() => {
  mockUser.value = { id: USER_ID };
  mockUpdateIssue.mockReset();
  mockGetIssueById.mockReset();
  mockInsertActivity.mockReset();
  mockGetProfileNameById.mockReset();
  mockAssertProjectAccess.mockReset();
  mockNotifySlack.mockReset();
  mockResolveSlackEvent.mockReset();
  mockNotify.mockReset();
  mockNotify.mockResolvedValue(undefined);
  mockInsertActivity.mockResolvedValue({ success: true });
  mockAssertProjectAccess.mockResolvedValue(undefined);
  mockResolveSlackEvent.mockReturnValue(null);
});

describe("updateIssueAction — notify wiring", () => {
  it("triggert notifyFeedbackStatusChanged bij transitie naar in_progress en geeft cookie-client mee", async () => {
    mockGetIssueById.mockResolvedValue({ ...BASE_ISSUE, status: "todo" });
    const updated = { ...BASE_ISSUE, status: "in_progress" };
    mockUpdateIssue.mockResolvedValue({ success: true, data: updated });

    const result = await updateIssueAction({ id: ISSUE_ID, status: "in_progress" });

    expect(result).toEqual({ success: true });
    expect(mockNotify).toHaveBeenCalledTimes(1);
    const [calledIssue, calledStatus, calledClient] = mockNotify.mock.calls[0]!;
    expect(calledIssue).toBe(updated);
    expect(calledStatus).toBe("in_progress");
    // CC-007 — derde arg is de cookie-client (niet undefined / niet admin).
    expect(calledClient).toBeDefined();
    expect(calledClient).toMatchObject({ __mock: "cookie-client" });
  });

  it("triggert notify bij transitie naar done", async () => {
    mockGetIssueById.mockResolvedValue({ ...BASE_ISSUE, status: "in_progress" });
    const updated = { ...BASE_ISSUE, status: "done" };
    mockUpdateIssue.mockResolvedValue({ success: true, data: updated });

    await updateIssueAction({ id: ISSUE_ID, status: "done" });

    expect(mockNotify).toHaveBeenCalled();
    const [, status] = mockNotify.mock.calls[0]!;
    expect(status).toBe("done");
  });

  it("triggert OOK bij transitie naar triage / declined / deferred / converted_to_qa (CC-007 trigger-coverage)", async () => {
    for (const target of ["triage", "declined", "deferred", "converted_to_qa"] as const) {
      mockNotify.mockClear();
      mockGetIssueById.mockResolvedValue({ ...BASE_ISSUE, status: "needs_pm_review" });
      mockUpdateIssue.mockResolvedValue({ success: true, data: { ...BASE_ISSUE, status: target } });

      await updateIssueAction({ id: ISSUE_ID, status: target });

      expect(mockNotify).toHaveBeenCalledTimes(1);
      const [, status] = mockNotify.mock.calls[0]!;
      expect(status).toBe(target);
    }
  });

  it("triggert NIET als status onveranderd blijft", async () => {
    mockGetIssueById.mockResolvedValue({ ...BASE_ISSUE, status: "in_progress" });
    mockUpdateIssue.mockResolvedValue({
      success: true,
      data: { ...BASE_ISSUE, status: "in_progress", priority: "high" },
    });

    await updateIssueAction({ id: ISSUE_ID, priority: "high" });

    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("triggert NIET bij transitie naar backlog / todo / cancelled", async () => {
    mockGetIssueById.mockResolvedValue({ ...BASE_ISSUE, status: "triage" });
    mockUpdateIssue.mockResolvedValue({
      success: true,
      data: { ...BASE_ISSUE, status: "backlog" },
    });

    await updateIssueAction({ id: ISSUE_ID, status: "backlog" });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("notify-failure laat de action niet falen", async () => {
    mockGetIssueById.mockResolvedValue({ ...BASE_ISSUE, status: "todo" });
    mockUpdateIssue.mockResolvedValue({
      success: true,
      data: { ...BASE_ISSUE, status: "in_progress" },
    });
    mockNotify.mockRejectedValueOnce(new Error("resend down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await updateIssueAction({ id: ISSUE_ID, status: "in_progress" });
    expect(result).toEqual({ success: true });
  });
});
