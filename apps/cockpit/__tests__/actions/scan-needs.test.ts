import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

const mockScanAllUnscannedMeetings = vi.fn();
vi.mock("@repo/ai/pipeline/scan-needs", () => ({
  scanAllUnscannedMeetings: (...args: unknown[]) => mockScanAllUnscannedMeetings(...args),
}));

const mockUpdateNeedStatus = vi.fn();
vi.mock("@repo/database/mutations/extractions", () => ({
  updateNeedStatus: (...args: unknown[]) => mockUpdateNeedStatus(...args),
}));

describeWithDb("Scan Needs Actions (integration)")("Scan Needs Actions (integration)", () => {
  beforeEach(() => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    mockScanAllUnscannedMeetings.mockReset();
    mockUpdateNeedStatus.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("scanTeamNeedsAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/scan-needs");
      return mod.scanTeamNeedsAction;
    }

    it("returns success with scanned and needs counts", async () => {
      mockScanAllUnscannedMeetings.mockResolvedValue({
        errors: [],
        total_scanned: 5,
        total_needs: 3,
      });

      const action = await getAction();
      const result = await action();

      expect(result).toEqual({ success: true, scanned: 5, needs: 3 });
      expect(mockScanAllUnscannedMeetings).toHaveBeenCalledOnce();
    });

    it("returns success even with partial failures (logs errors)", async () => {
      mockScanAllUnscannedMeetings.mockResolvedValue({
        errors: [new Error("partial fail")],
        total_scanned: 3,
        total_needs: 1,
      });

      const action = await getAction();
      const result = await action();

      expect(result).toEqual({ success: true, scanned: 3, needs: 1 });
    });

    it("revalidates intelligence paths", async () => {
      mockScanAllUnscannedMeetings.mockResolvedValue({
        errors: [],
        total_scanned: 0,
        total_needs: 0,
      });

      const action = await getAction();
      await action();

      const paths = getRevalidatePathCalls();
      expect(paths).toContain("/intelligence/team");
      expect(paths).toContain("/intelligence");
    });

    it("returns Unauthorized when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action();

      expect(result).toEqual({ error: "Unauthorized" });
      expect(mockScanAllUnscannedMeetings).not.toHaveBeenCalled();
    });
  });

  describe("updateNeedStatusAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/scan-needs");
      return mod.updateNeedStatusAction;
    }

    it("updates need status", async () => {
      mockUpdateNeedStatus.mockResolvedValue({ success: true });

      const action = await getAction();
      const result = await action({
        needId: TEST_IDS.extraction,
        status: "erkend",
      });

      expect(result).toEqual({ success: true });
      expect(mockUpdateNeedStatus).toHaveBeenCalledWith(TEST_IDS.extraction, "erkend");
    });

    it("returns error for invalid status enum", async () => {
      const action = await getAction();
      const result = await action({
        needId: TEST_IDS.extraction,
        status: "invalid_status" as never,
      });

      expect(result).toHaveProperty("error");
      expect(mockUpdateNeedStatus).not.toHaveBeenCalled();
    });

    it("returns Unauthorized when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        needId: TEST_IDS.extraction,
        status: "open",
      });

      expect(result).toEqual({ error: "Unauthorized" });
    });
  });
});
