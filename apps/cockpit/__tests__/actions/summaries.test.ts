import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAuthenticated, mockUnauthenticated, createServerMock } from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks, getRevalidatePathCalls } from "../helpers/mock-next";
// RFC 4122 compliant UUIDs for unit tests (Zod 4 validates variant bits)
const IDS = {
  userId: "00000000-0000-4000-8000-000000000099",
  project: "00000000-0000-4000-8000-000000000002",
  organization: "00000000-0000-4000-8000-000000000001",
};

vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createServerMock());
vi.mock("@repo/auth/access", () => ({
  isAdmin: vi.fn().mockResolvedValue(true),
}));

const mockGenerateProjectSummaries = vi.fn();
const mockGenerateOrgSummaries = vi.fn();
vi.mock("@repo/ai/pipeline/summary-pipeline", () => ({
  generateProjectSummaries: (...args: unknown[]) => mockGenerateProjectSummaries(...args),
  generateOrgSummaries: (...args: unknown[]) => mockGenerateOrgSummaries(...args),
}));

describe("Summaries Actions", () => {
  beforeEach(() => {
    mockAuthenticated(IDS.userId);
    resetNextMocks();
    mockGenerateProjectSummaries.mockReset();
    mockGenerateOrgSummaries.mockReset();
  });

  describe("regenerateSummaryAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/summaries");
      return mod.regenerateSummaryAction;
    }

    it("calls generateProjectSummaries for project type", async () => {
      mockGenerateProjectSummaries.mockResolvedValue({ success: true });

      const action = await getAction();
      const result = await action({
        entityType: "project",
        entityId: IDS.project,
      });

      expect(result).toEqual({ success: true });
      expect(mockGenerateProjectSummaries).toHaveBeenCalledWith(IDS.project);
      expect(mockGenerateOrgSummaries).not.toHaveBeenCalled();
    });

    it("calls generateOrgSummaries for organization type", async () => {
      mockGenerateOrgSummaries.mockResolvedValue({ success: true });

      const action = await getAction();
      const result = await action({
        entityType: "organization",
        entityId: IDS.organization,
      });

      expect(result).toEqual({ success: true });
      expect(mockGenerateOrgSummaries).toHaveBeenCalledWith(IDS.organization);
      expect(mockGenerateProjectSummaries).not.toHaveBeenCalled();
    });

    it("revalidates project path for project type", async () => {
      mockGenerateProjectSummaries.mockResolvedValue({ success: true });

      const action = await getAction();
      await action({
        entityType: "project",
        entityId: IDS.project,
      });

      const paths = getRevalidatePathCalls();
      expect(paths).toContain(`/projects/${IDS.project}`);
      expect(paths).toContain("/");
    });

    it("forwards AI errors correctly", async () => {
      mockGenerateProjectSummaries.mockResolvedValue({
        success: false,
        error: "AI rate limit exceeded",
      });

      const action = await getAction();
      const result = await action({
        entityType: "project",
        entityId: IDS.project,
      });

      expect(result).toEqual({ error: "AI rate limit exceeded" });
    });

    it("returns default error when AI fails without message", async () => {
      mockGenerateOrgSummaries.mockResolvedValue({
        success: false,
      });

      const action = await getAction();
      const result = await action({
        entityType: "organization",
        entityId: IDS.organization,
      });

      expect(result).toEqual({ error: "Samenvatting genereren mislukt" });
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        entityType: "project",
        entityId: IDS.project,
      });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });

    it("returns error on invalid input", async () => {
      const action = await getAction();
      const result = await action({
        entityType: "invalid" as never,
        entityId: IDS.project,
      });

      expect(result).toHaveProperty("error");
    });
  });
});
