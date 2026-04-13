import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAuthenticated, mockUnauthenticated, createServerMock } from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks, getRevalidatePathCalls } from "../helpers/mock-next";
import { TEST_IDS } from "../../../../packages/database/__tests__/helpers/seed";

vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createServerMock());
vi.mock("@repo/auth/access", () => ({
  isAdmin: vi.fn().mockResolvedValue(true),
}));

const mockGenerateWeeklySummary = vi.fn();
vi.mock("@repo/ai/pipeline/weekly-summary-pipeline", () => ({
  generateWeeklySummary: (...args: unknown[]) => mockGenerateWeeklySummary(...args),
}));

describe("Weekly Summary Actions", () => {
  beforeEach(() => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    mockGenerateWeeklySummary.mockReset();
  });

  describe("generateWeeklySummaryAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/weekly-summary");
      return mod.generateWeeklySummaryAction;
    }

    it("calls pipeline and returns success", async () => {
      mockGenerateWeeklySummary.mockResolvedValue({ success: true });

      const action = await getAction();
      const result = await action({});

      expect(result).toEqual({ success: true });
      expect(mockGenerateWeeklySummary).toHaveBeenCalledWith(undefined, undefined);
    });

    it("passes weekStart and weekEnd to pipeline", async () => {
      mockGenerateWeeklySummary.mockResolvedValue({ success: true });

      const action = await getAction();
      await action({ weekStart: "2026-04-07", weekEnd: "2026-04-13" });

      expect(mockGenerateWeeklySummary).toHaveBeenCalledWith("2026-04-07", "2026-04-13");
    });

    it("revalidates /weekly path", async () => {
      mockGenerateWeeklySummary.mockResolvedValue({ success: true });

      const action = await getAction();
      await action({});

      const paths = getRevalidatePathCalls();
      expect(paths).toContain("/weekly");
    });

    it("forwards pipeline errors", async () => {
      mockGenerateWeeklySummary.mockResolvedValue({
        success: false,
        error: "No data available",
      });

      const action = await getAction();
      const result = await action({});

      expect(result).toEqual({ error: "No data available" });
    });

    it("returns default error when pipeline fails without message", async () => {
      mockGenerateWeeklySummary.mockResolvedValue({ success: false });

      const action = await getAction();
      const result = await action({});

      expect(result).toEqual({ error: "Genereren mislukt." });
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({});

      expect(result).toEqual({ error: "Niet ingelogd." });
    });
  });
});
