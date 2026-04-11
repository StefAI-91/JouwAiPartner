import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockAuthenticated,
  mockUnauthenticated,
  createIntegrationServerMock,
} from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks, getRevalidatePathCalls } from "../helpers/mock-next";
import { TEST_IDS } from "../../../../packages/database/__tests__/helpers/seed";
import { describeWithDb } from "../helpers/describe-with-db";

vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createIntegrationServerMock());

const mockInsertComment = vi.fn();
const mockUpdateComment = vi.fn();
const mockDeleteComment = vi.fn();
const mockInsertActivity = vi.fn();
vi.mock("@repo/database/mutations/issues", () => ({
  insertComment: (...args: unknown[]) => mockInsertComment(...args),
  updateComment: (...args: unknown[]) => mockUpdateComment(...args),
  deleteComment: (...args: unknown[]) => mockDeleteComment(...args),
  insertActivity: (...args: unknown[]) => mockInsertActivity(...args),
}));

const COMMENT_ID = "00000000-0000-0000-0000-000000000020";

describeWithDb("Comment Actions (integration)")("Comment Actions (integration)", () => {
  beforeEach(() => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    mockInsertComment.mockReset();
    mockUpdateComment.mockReset();
    mockDeleteComment.mockReset();
    mockInsertActivity.mockReset();
  });

  describe("createCommentAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/comments");
      return mod.createCommentAction;
    }

    it("inserts comment with author_id and logs 'commented' activity", async () => {
      mockInsertComment.mockResolvedValue({ id: COMMENT_ID });
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      const result = await action({
        issue_id: TEST_IDS.issue,
        body: "This is a test comment",
      });

      expect(result).toEqual({ success: true });
      expect(mockInsertComment).toHaveBeenCalledWith({
        issue_id: TEST_IDS.issue,
        author_id: TEST_IDS.userId,
        body: "This is a test comment",
      });
      expect(mockInsertActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_id: TEST_IDS.issue,
          actor_id: TEST_IDS.userId,
          action: "commented",
        }),
      );
    });

    it("returns error on empty body", async () => {
      const action = await getAction();
      const result = await action({
        issue_id: TEST_IDS.issue,
        body: "",
      });

      expect(result).toHaveProperty("error");
      expect(mockInsertComment).not.toHaveBeenCalled();
    });

    it("revalidates issue paths", async () => {
      mockInsertComment.mockResolvedValue({ id: COMMENT_ID });
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({ issue_id: TEST_IDS.issue, body: "Test" });

      const paths = getRevalidatePathCalls();
      expect(paths).toContain("/issues");
      expect(paths).toContain(`/issues/${TEST_IDS.issue}`);
    });

    it("returns error without auth", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        issue_id: TEST_IDS.issue,
        body: "Test",
      });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("updateCommentAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/comments");
      return mod.updateCommentAction;
    }

    it("updates comment body", async () => {
      mockUpdateComment.mockResolvedValue({ id: COMMENT_ID });

      const action = await getAction();
      const result = await action({
        id: COMMENT_ID,
        issue_id: TEST_IDS.issue,
        body: "Updated comment body",
      });

      expect(result).toEqual({ success: true });
      expect(mockUpdateComment).toHaveBeenCalledWith(COMMENT_ID, "Updated comment body");
    });

    it("returns error on empty body", async () => {
      const action = await getAction();
      const result = await action({
        id: COMMENT_ID,
        issue_id: TEST_IDS.issue,
        body: "",
      });

      expect(result).toHaveProperty("error");
    });

    it("returns error without auth", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        id: COMMENT_ID,
        issue_id: TEST_IDS.issue,
        body: "Test",
      });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("deleteCommentAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/comments");
      return mod.deleteCommentAction;
    }

    it("deletes comment and logs 'comment_deleted' activity", async () => {
      mockDeleteComment.mockResolvedValue(undefined);
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      const result = await action({
        id: COMMENT_ID,
        issue_id: TEST_IDS.issue,
      });

      expect(result).toEqual({ success: true });
      expect(mockDeleteComment).toHaveBeenCalledWith(COMMENT_ID);
      expect(mockInsertActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_id: TEST_IDS.issue,
          action: "comment_deleted",
        }),
      );
    });

    it("returns error without auth", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        id: COMMENT_ID,
        issue_id: TEST_IDS.issue,
      });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });
});
