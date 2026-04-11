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

const mockGetIssueById = vi.fn();
vi.mock("@repo/database/queries/issues", () => ({
  getIssueById: (...args: unknown[]) => mockGetIssueById(...args),
}));

const mockUpdateIssue = vi.fn();
const mockInsertActivity = vi.fn();
vi.mock("@repo/database/mutations/issues", () => ({
  updateIssue: (...args: unknown[]) => mockUpdateIssue(...args),
  insertActivity: (...args: unknown[]) => mockInsertActivity(...args),
}));

const mockRunIssueClassifier = vi.fn();
vi.mock("@repo/ai/agents/issue-classifier", () => ({
  runIssueClassifier: (...args: unknown[]) => mockRunIssueClassifier(...args),
}));

const baseMockIssue = {
  id: TEST_IDS.issue,
  title: "Test Bug",
  description: "Description",
  source: "userback",
  source_url: "https://example.com/page",
  source_metadata: { feedbackType: "bug" },
};

const mockClassifyResult = {
  type: "bug",
  component: "frontend",
  severity: "high",
  repro_steps: "1. Open page\n2. Click button",
  confidence: 0.92,
};

describeWithDb("Classify Actions (integration)")("Classify Actions (integration)", () => {
  beforeEach(() => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    mockGetIssueById.mockReset();
    mockUpdateIssue.mockReset();
    mockInsertActivity.mockReset();
    mockRunIssueClassifier.mockReset();
  });

  describe("classifyIssueAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/classify");
      return mod.classifyIssueAction;
    }

    it("classifies issue and writes ai_classification + component + severity", async () => {
      mockGetIssueById.mockResolvedValue(baseMockIssue);
      mockRunIssueClassifier.mockResolvedValue(mockClassifyResult);
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      const result = await action({ id: TEST_IDS.issue });

      expect(result).toEqual({ success: true });
      expect(mockUpdateIssue).toHaveBeenCalledWith(
        TEST_IDS.issue,
        expect.objectContaining({
          component: "frontend",
          severity: "high",
          ai_classified_at: expect.any(String),
          ai_classification: expect.objectContaining({
            confidence: 0.92,
            model: "claude-haiku-4-5",
          }),
        }),
      );
    });

    it("sets type for manual issues", async () => {
      mockGetIssueById.mockResolvedValue({ ...baseMockIssue, source: "manual" });
      mockRunIssueClassifier.mockResolvedValue(mockClassifyResult);
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({ id: TEST_IDS.issue });

      expect(mockUpdateIssue).toHaveBeenCalledWith(
        TEST_IDS.issue,
        expect.objectContaining({ type: "bug" }),
      );
    });

    it("logs activity with confidence in metadata", async () => {
      mockGetIssueById.mockResolvedValue(baseMockIssue);
      mockRunIssueClassifier.mockResolvedValue(mockClassifyResult);
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({ id: TEST_IDS.issue });

      expect(mockInsertActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_id: TEST_IDS.issue,
          action: "classified",
          metadata: expect.objectContaining({
            confidence: 0.92,
            model: "claude-haiku-4-5",
          }),
        }),
      );
    });

    it("revalidates issue paths", async () => {
      mockGetIssueById.mockResolvedValue(baseMockIssue);
      mockRunIssueClassifier.mockResolvedValue(mockClassifyResult);
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({ id: TEST_IDS.issue });

      const paths = getRevalidatePathCalls();
      expect(paths).toContain("/issues");
      expect(paths).toContain(`/issues/${TEST_IDS.issue}`);
    });

    it("returns error without auth", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({ id: TEST_IDS.issue });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("classifyIssueBackground", () => {
    async function getAction() {
      const mod = await import("../../src/actions/classify");
      return mod.classifyIssueBackground;
    }

    it("does not throw on error (swallows silently)", async () => {
      mockGetIssueById.mockRejectedValue(new Error("DB error"));

      const action = await getAction();
      // Should not throw
      await expect(action(TEST_IDS.issue)).resolves.toBeUndefined();
    });

    it("classifies same fields as interactive version", async () => {
      mockGetIssueById.mockResolvedValue(baseMockIssue);
      mockRunIssueClassifier.mockResolvedValue(mockClassifyResult);
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action(TEST_IDS.issue);

      expect(mockUpdateIssue).toHaveBeenCalledWith(
        TEST_IDS.issue,
        expect.objectContaining({
          component: "frontend",
          severity: "high",
          ai_classified_at: expect.any(String),
        }),
      );
    });
  });
});
