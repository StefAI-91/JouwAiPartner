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
  it("triggert notifyFeedbackStatusChanged bij transitie naar in_progress", async () => {
    mockGetIssueById.mockResolvedValue({ ...BASE_ISSUE, status: "todo" });
    const updated = { ...BASE_ISSUE, status: "in_progress" };
    mockUpdateIssue.mockResolvedValue({ success: true, data: updated });

    const result = await updateIssueAction({ id: ISSUE_ID, status: "in_progress" });

    expect(result).toEqual({ success: true });
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(updated, "in_progress");
  });

  it("triggert notify bij transitie naar done", async () => {
    mockGetIssueById.mockResolvedValue({ ...BASE_ISSUE, status: "in_progress" });
    const updated = { ...BASE_ISSUE, status: "done" };
    mockUpdateIssue.mockResolvedValue({ success: true, data: updated });

    await updateIssueAction({ id: ISSUE_ID, status: "done" });

    expect(mockNotify).toHaveBeenCalledWith(updated, "done");
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
