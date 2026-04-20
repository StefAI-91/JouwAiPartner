import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mockAuthenticated,
  mockUnauthenticated,
  createIntegrationServerMock,
} from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks } from "../helpers/mock-next";
import { TEST_IDS } from "../../../../packages/database/__tests__/helpers/seed";
import { describeWithDb } from "../helpers/describe-with-db";

vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createIntegrationServerMock());

const mockInsertIssue = vi.fn();
const mockUpdateIssue = vi.fn();
const mockDeleteIssue = vi.fn();
const mockInsertActivity = vi.fn();
vi.mock("@repo/database/mutations/issues", () => ({
  insertIssue: (...args: unknown[]) => mockInsertIssue(...args),
  updateIssue: (...args: unknown[]) => mockUpdateIssue(...args),
  deleteIssue: (...args: unknown[]) => mockDeleteIssue(...args),
  insertActivity: (...args: unknown[]) => mockInsertActivity(...args),
}));

const mockGetIssueById = vi.fn();
vi.mock("@repo/database/queries/issues", () => ({
  getIssueById: (...args: unknown[]) => mockGetIssueById(...args),
}));

const mockClassifyIssueBackground = vi.fn();
vi.mock("../../src/actions/classify", () => ({
  classifyIssueBackground: (...args: unknown[]) => mockClassifyIssueBackground(...args),
}));

describeWithDb("Issue Actions (integration)")("Issue Actions (integration)", () => {
  beforeEach(() => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    mockInsertIssue.mockReset();
    mockUpdateIssue.mockReset();
    mockDeleteIssue.mockReset();
    mockInsertActivity.mockReset();
    mockGetIssueById.mockReset();
    mockClassifyIssueBackground.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createIssueAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/issues");
      return mod.createIssueAction;
    }

    it("creates issue and returns { success, id }", async () => {
      mockInsertIssue.mockResolvedValue({ id: TEST_IDS.issue });
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      const result = await action({
        project_id: TEST_IDS.project,
        title: "Test Bug",
        type: "bug",
        priority: "medium",
      });

      expect(result).toEqual({ success: true, id: TEST_IDS.issue });
      expect(mockInsertIssue).toHaveBeenCalledOnce();
    });

    it("logs 'created' activity after insert", async () => {
      mockInsertIssue.mockResolvedValue({ id: TEST_IDS.issue });
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({
        project_id: TEST_IDS.project,
        title: "Test Bug",
      });

      expect(mockInsertActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_id: TEST_IDS.issue,
          actor_id: TEST_IDS.userId,
          action: "created",
        }),
      );
    });

    it("triggers classifyIssueBackground fire-and-forget", async () => {
      mockInsertIssue.mockResolvedValue({ id: TEST_IDS.issue });
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({
        project_id: TEST_IDS.project,
        title: "Test Bug",
      });

      expect(mockClassifyIssueBackground).toHaveBeenCalledWith(TEST_IDS.issue);
    });

    it("returns error on invalid input", async () => {
      const action = await getAction();
      const result = await action({
        project_id: "not-a-uuid",
        title: "",
      } as never);

      expect(result).toHaveProperty("error");
      expect(mockInsertIssue).not.toHaveBeenCalled();
    });

    it("returns error without auth", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        project_id: TEST_IDS.project,
        title: "Test",
      });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("updateIssueAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/issues");
      return mod.updateIssueAction;
    }

    const baseMockIssue = {
      id: TEST_IDS.issue,
      title: "Original Title",
      status: "triage",
      priority: "medium",
      type: "bug",
      component: null,
      severity: null,
      assigned_to: null,
      labels: [],
    };

    it("updates issue fields", async () => {
      mockGetIssueById.mockResolvedValue(baseMockIssue);
      mockUpdateIssue.mockResolvedValue({ ...baseMockIssue, priority: "high" });
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      const result = await action({
        id: TEST_IDS.issue,
        priority: "high",
      });

      expect(result).toEqual({ success: true });
      expect(mockUpdateIssue).toHaveBeenCalledWith(
        TEST_IDS.issue,
        expect.objectContaining({ priority: "high" }),
      );
    });

    it("sets closed_at when closing issue", async () => {
      mockGetIssueById.mockResolvedValue({ ...baseMockIssue, status: "todo" });
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({ id: TEST_IDS.issue, status: "done" });

      expect(mockUpdateIssue).toHaveBeenCalledWith(
        TEST_IDS.issue,
        expect.objectContaining({ closed_at: expect.any(String) }),
      );
    });

    it("clears closed_at when reopening issue", async () => {
      mockGetIssueById.mockResolvedValue({ ...baseMockIssue, status: "done" });
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({ id: TEST_IDS.issue, status: "todo" });

      expect(mockUpdateIssue).toHaveBeenCalledWith(
        TEST_IDS.issue,
        expect.objectContaining({ closed_at: null }),
      );
    });

    it("logs activity per changed field", async () => {
      mockGetIssueById.mockResolvedValue(baseMockIssue);
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({
        id: TEST_IDS.issue,
        status: "backlog",
        priority: "high",
      });

      expect(mockInsertActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "status_changed",
          field: "status",
          old_value: "triage",
          new_value: "backlog",
        }),
      );
      expect(mockInsertActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "priority_changed",
          field: "priority",
          old_value: "medium",
          new_value: "high",
        }),
      );
    });

    it("logs label added and removed separately", async () => {
      mockGetIssueById.mockResolvedValue({ ...baseMockIssue, labels: ["existing"] });
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({
        id: TEST_IDS.issue,
        labels: ["new-label"],
      });

      expect(mockInsertActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: "label_added", new_value: "new-label" }),
      );
      expect(mockInsertActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: "label_removed", old_value: "existing" }),
      );
    });

    it("returns error without auth", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({ id: TEST_IDS.issue, title: "New" });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("deleteIssueAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/issues");
      return mod.deleteIssueAction;
    }

    it("deletes issue", async () => {
      mockDeleteIssue.mockResolvedValue(undefined);

      const action = await getAction();
      const result = await action({ id: TEST_IDS.issue });

      expect(result).toEqual({ success: true });
      expect(mockDeleteIssue).toHaveBeenCalledWith(TEST_IDS.issue);
    });

    it("returns error without auth", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({ id: TEST_IDS.issue });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });

    it("returns error on invalid input", async () => {
      const action = await getAction();
      const result = await action({ id: "not-uuid" } as never);

      expect(result).toHaveProperty("error");
    });
  });
});
