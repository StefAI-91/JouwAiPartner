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

const mockRunIssueExecutor = vi.fn();
vi.mock("@repo/ai/agents/issue-executor", () => ({
  runIssueExecutor: (...args: unknown[]) => mockRunIssueExecutor(...args),
}));

const baseMockIssue = {
  id: TEST_IDS.issue,
  title: "Fix login bug",
  description: "Login fails on mobile",
  type: "bug",
  component: "frontend",
  severity: "high",
  ai_classification: { repro_steps: "1. Open mobile\n2. Click login" },
};

const mockExecutorPlan = {
  analysis: "Authentication state not preserved on mobile",
  approach: "Fix session storage handling",
  complexity: "medium",
  affected_files: ["src/auth/session.ts"],
  estimated_total_minutes: 30,
  steps: [
    { title: "Analyze session code", description: "Review auth flow" },
    { title: "Fix storage handler", description: "Update session persistence" },
    { title: "Write tests", description: "Add mobile auth tests" },
  ],
};

describeWithDb("Execute Actions (integration)")("Execute Actions (integration)", () => {
  beforeEach(() => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    mockGetIssueById.mockReset();
    mockUpdateIssue.mockReset();
    mockInsertActivity.mockReset();
    mockRunIssueExecutor.mockReset();
  });

  describe("startAiExecution", () => {
    async function getAction() {
      const mod = await import("../../src/actions/execute");
      return mod.startAiExecution;
    }

    it("generates plan and updates issue with ai_context and ai_result", async () => {
      mockGetIssueById.mockResolvedValue(baseMockIssue);
      mockRunIssueExecutor.mockResolvedValue(mockExecutorPlan);
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      const result = await action({ issueId: TEST_IDS.issue });

      expect(result).toEqual({ success: true });
      expect(mockUpdateIssue).toHaveBeenCalledWith(
        TEST_IDS.issue,
        expect.objectContaining({
          execution_type: "ai",
          ai_executable: true,
          ai_context: expect.objectContaining({
            analysis: "Authentication state not preserved on mobile",
            approach: "Fix session storage handling",
            complexity: "medium",
            affected_files: ["src/auth/session.ts"],
            estimated_total_minutes: 30,
          }),
          ai_result: expect.objectContaining({
            status: "executing",
            current_step: 0,
          }),
        }),
      );
    });

    it("first step is in_progress, rest pending", async () => {
      mockGetIssueById.mockResolvedValue(baseMockIssue);
      mockRunIssueExecutor.mockResolvedValue(mockExecutorPlan);
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({ issueId: TEST_IDS.issue });

      const updateCall = mockUpdateIssue.mock.calls[0];
      const aiResult = updateCall[1].ai_result as { steps: { status: string }[] };
      expect(aiResult.steps[0].status).toBe("in_progress");
      expect(aiResult.steps[1].status).toBe("pending");
      expect(aiResult.steps[2].status).toBe("pending");
    });

    it("logs ai_started activity with metadata", async () => {
      mockGetIssueById.mockResolvedValue(baseMockIssue);
      mockRunIssueExecutor.mockResolvedValue(mockExecutorPlan);
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({ issueId: TEST_IDS.issue });

      expect(mockInsertActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_id: TEST_IDS.issue,
          action: "ai_started",
          metadata: expect.objectContaining({
            complexity: "medium",
            estimated_minutes: 30,
            step_count: 3,
          }),
        }),
      );
    });

    it("returns error for non-existent issue", async () => {
      mockGetIssueById.mockResolvedValue(null);

      const action = await getAction();
      const result = await action({ issueId: TEST_IDS.issue });

      expect(result).toEqual({ error: "Issue niet gevonden" });
    });

    it("returns error without auth", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({ issueId: TEST_IDS.issue });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });

    it("revalidates issue path", async () => {
      mockGetIssueById.mockResolvedValue(baseMockIssue);
      mockRunIssueExecutor.mockResolvedValue(mockExecutorPlan);
      mockUpdateIssue.mockResolvedValue({});
      mockInsertActivity.mockResolvedValue(undefined);

      const action = await getAction();
      await action({ issueId: TEST_IDS.issue });

      const paths = getRevalidatePathCalls();
      expect(paths).toContain(`/issues/${TEST_IDS.issue}`);
    });
  });
});
