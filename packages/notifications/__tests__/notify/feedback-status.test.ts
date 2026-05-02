import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * CC-002 — notifyFeedbackStatusChanged unit-test.
 *
 * Mock-grens: `@repo/database/queries/portal` (DB-call voor recipients) +
 * eigen `sendMail` (boundary). We asserteren wát er naar sendMail gaat.
 */

const mockListAssignees = vi.fn();
const mockSendMail = vi.fn();

vi.mock("@repo/database/queries/portal", () => ({
  listPortalProjectAssignees: (...args: unknown[]) => mockListAssignees(...args),
}));

vi.mock("../../src/send", () => ({
  sendMail: (...args: unknown[]) => mockSendMail(...args),
}));

import { notifyFeedbackStatusChanged } from "../../src/notify/feedback-status";
import type { IssueForTemplate } from "../../src/templates/types";

const baseIssue: IssueForTemplate = {
  id: "issue-1",
  project_id: "proj-1",
  title: "Knop werkt niet",
  client_title: null,
  status: "needs_pm_review",
  decline_reason: null,
};

beforeEach(() => {
  mockListAssignees.mockReset();
  mockSendMail.mockReset();
  mockSendMail.mockResolvedValue({ ok: true });
  process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.jouwai.nl";
});

describe("notifyFeedbackStatusChanged", () => {
  it("stuurt geen mail voor een niet-getriggerde status (backlog)", async () => {
    mockListAssignees.mockResolvedValueOnce([
      { profile_id: "p1", email: "klant@x.nl", role: "client" },
    ]);

    await notifyFeedbackStatusChanged(baseIssue, "backlog");

    expect(mockSendMail).not.toHaveBeenCalled();
    // `backlog` is een early-skip vóór de assignees-lookup — assignees-call
    // gebeurt wel/niet, kost geen geld. We asserteren alleen op sendMail.
  });

  it("stuurt geen mail wanneer er geen klant-recipients zijn", async () => {
    mockListAssignees.mockResolvedValueOnce([
      { profile_id: "p1", email: "team@x.nl", role: "member" },
    ]);

    await notifyFeedbackStatusChanged(baseIssue, "triage");

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("stuurt mail naar elke klant-recipient (filtert non-client weg)", async () => {
    mockListAssignees.mockResolvedValueOnce([
      { profile_id: "p1", email: "klant1@x.nl", role: "client" },
      { profile_id: "p2", email: "klant2@x.nl", role: "client" },
      { profile_id: "p3", email: "team@x.nl", role: "member" },
      { profile_id: "p4", email: "admin@x.nl", role: "admin" },
    ]);

    await notifyFeedbackStatusChanged(baseIssue, "triage");

    expect(mockSendMail).toHaveBeenCalledTimes(2);
    const recipients = mockSendMail.mock.calls.map((c) => c[0].to);
    expect(recipients).toEqual(expect.arrayContaining(["klant1@x.nl", "klant2@x.nl"]));
    expect(recipients).not.toContain("team@x.nl");

    const firstCall = mockSendMail.mock.calls[0]![0];
    expect(firstCall.tag).toBe("feedback-triage");
    expect(firstCall.subject).toBe("Je verzoek staat in de planning");
  });

  it("decline-mail bevat de raw decline_reason", async () => {
    mockListAssignees.mockResolvedValueOnce([
      { profile_id: "p1", email: "klant@x.nl", role: "client" },
    ]);
    const reason = "Geen capaciteit dit kwartaal.";

    await notifyFeedbackStatusChanged({ ...baseIssue, decline_reason: reason }, "declined");

    const call = mockSendMail.mock.calls[0]![0];
    expect(call.tag).toBe("feedback-declined");
    expect(call.html).toContain(reason);
    expect(call.text).toContain(reason);
  });

  it("vangt errors uit listPortalProjectAssignees (best-effort, swallow)", async () => {
    mockListAssignees.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(notifyFeedbackStatusChanged(baseIssue, "triage")).resolves.toBeUndefined();
    expect(mockSendMail).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith(
      "[notifyFeedbackStatusChanged] failed",
      expect.objectContaining({ issueId: "issue-1", newStatus: "triage" }),
    );
  });
});
