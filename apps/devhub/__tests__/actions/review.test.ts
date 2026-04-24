import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServerMock } from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks, getRevalidatePathCalls } from "../helpers/mock-next";

// RFC 4122 compliant UUIDs for unit tests (Zod 4 validates variant bits)
const IDS = {
  userId: "00000000-0000-4000-8000-000000000099",
  project: "00000000-0000-4000-8000-000000000002",
};

vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createServerMock());

// Mock de admin-grens: review.ts importeert `getAdminClient` op module-niveau
// (voor isAuthBypassed-pad). Zonder mock crasht de module-load met
// "supabaseUrl is required" omdat .env.local niet door vitest geladen wordt.
vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({})),
}));

// Bypass project-access check (apart getest in auth-tests).
vi.mock("@repo/auth/access", () => ({
  assertProjectAccess: vi.fn(async () => undefined),
  NotAuthorizedError: class NotAuthorizedError extends Error {},
}));

const mockListIssues = vi.fn();
vi.mock("@repo/database/queries/issues", () => ({
  listIssues: (...args: unknown[]) => mockListIssues(...args),
}));

const mockGetProjectById = vi.fn();
vi.mock("@repo/database/queries/projects", () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

const mockSaveProjectReview = vi.fn();
vi.mock("@repo/database/mutations/projects/reviews", () => ({
  saveProjectReview: (...args: unknown[]) => mockSaveProjectReview(...args),
}));

const mockRunIssueReviewer = vi.fn();
vi.mock("@repo/ai/agents/issue-reviewer", () => ({
  runIssueReviewer: (...args: unknown[]) => mockRunIssueReviewer(...args),
}));

vi.mock("@repo/auth/helpers", () => {
  let _user: { id: string } | null = null;
  return {
    getAuthenticatedUser: vi.fn(async () => _user),
    isAuthBypassed: vi.fn(() => false),
    __setMockUser: (user: { id: string } | null) => {
      _user = user;
    },
  };
});

const mockIssue = {
  id: "issue-1",
  issue_number: 1,
  title: "Login bug",
  description: "Cannot login on mobile",
  type: "bug",
  status: "triage",
  priority: "high",
  component: "frontend",
  severity: "high",
  labels: ["auth"],
  assigned_person: { full_name: "Test Dev" },
  source: "userback",
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-05T10:00:00Z",
  closed_at: null,
};

const mockReviewResult = {
  health_score: 72,
  health_label: "Needs Attention",
  summary: "Project has open high-priority bugs",
  patterns: ["Auth issues recurring"],
  risks: ["Mobile login broken"],
  action_items: ["Fix auth flow"],
};

describe("Review Actions", () => {
  beforeEach(async () => {
    resetNextMocks();
    mockListIssues.mockReset();
    mockGetProjectById.mockReset();
    mockSaveProjectReview.mockReset();
    mockRunIssueReviewer.mockReset();

    // Set authenticated user via the mocked auth helpers
    const authHelpers = await import("@repo/auth/helpers");
    (authHelpers as unknown as { __setMockUser: (u: { id: string } | null) => void }).__setMockUser(
      { id: IDS.userId },
    );
  });

  describe("generateProjectReview", () => {
    async function getAction() {
      const mod = await import("../../src/actions/review");
      return mod.generateProjectReview;
    }

    it("generates review and returns { success, reviewId }", async () => {
      mockListIssues.mockResolvedValue([mockIssue]);
      mockGetProjectById.mockResolvedValue({ name: "Test Project" });
      mockRunIssueReviewer.mockResolvedValue(mockReviewResult);
      mockSaveProjectReview.mockResolvedValue({ id: "review-1" });

      const action = await getAction();
      const result = await action({ projectId: IDS.project });

      expect(result).toEqual({ success: true, reviewId: "review-1" });
    });

    it("passes correct data to saveProjectReview", async () => {
      mockListIssues.mockResolvedValue([mockIssue]);
      mockGetProjectById.mockResolvedValue({ name: "P" });
      mockRunIssueReviewer.mockResolvedValue(mockReviewResult);
      mockSaveProjectReview.mockResolvedValue({ id: "review-1" });

      const action = await getAction();
      await action({ projectId: IDS.project });

      expect(mockSaveProjectReview).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: IDS.project,
          generated_by: IDS.userId,
          total_issues: 1,
          health_score: 72,
          health_label: "Needs Attention",
          summary: "Project has open high-priority bugs",
        }),
      );
    });

    it("computes metrics: status/priority/type counts", async () => {
      mockListIssues.mockResolvedValue([mockIssue]);
      mockGetProjectById.mockResolvedValue({ name: "P" });
      mockRunIssueReviewer.mockResolvedValue(mockReviewResult);
      mockSaveProjectReview.mockResolvedValue({ id: "review-1" });

      const action = await getAction();
      await action({ projectId: IDS.project });

      expect(mockSaveProjectReview).toHaveBeenCalledWith(
        expect.objectContaining({
          issues_by_status: { triage: 1 },
          issues_by_priority: { high: 1 },
          issues_by_type: { bug: 1 },
          avg_resolution_days: null, // no closed issues
        }),
      );
    });

    it("returns error when no issues found", async () => {
      mockListIssues.mockResolvedValue([]);

      const action = await getAction();
      const result = await action({ projectId: IDS.project });

      expect(result).toEqual({ error: "Geen issues gevonden voor dit project" });
    });

    it("revalidates /review path", async () => {
      mockListIssues.mockResolvedValue([mockIssue]);
      mockGetProjectById.mockResolvedValue({ name: "P" });
      mockRunIssueReviewer.mockResolvedValue(mockReviewResult);
      mockSaveProjectReview.mockResolvedValue({ id: "review-1" });

      const action = await getAction();
      await action({ projectId: IDS.project });

      expect(getRevalidatePathCalls()).toContain("/review");
    });

    it("returns error when not logged in", async () => {
      const authHelpers = await import("@repo/auth/helpers");
      (authHelpers as unknown as { __setMockUser: (u: null) => void }).__setMockUser(null);

      const action = await getAction();
      const result = await action({ projectId: IDS.project });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });

    it("forwards AI/DB errors with message", async () => {
      mockListIssues.mockRejectedValue(new Error("DB connection failed"));
      mockGetProjectById.mockResolvedValue({ name: "P" });

      const action = await getAction();
      const result = await action({ projectId: IDS.project });

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("DB connection failed");
    });

    it("returns error on invalid input", async () => {
      const action = await getAction();
      const result = await action({ projectId: "not-uuid" } as never);

      expect(result).toEqual({ error: "Ongeldig project ID" });
    });
  });
});
