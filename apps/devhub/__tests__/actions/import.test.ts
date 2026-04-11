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

const mockExecuteSyncPipeline = vi.fn();
vi.mock("@repo/database/integrations/userback-sync", () => ({
  executeSyncPipeline: (...args: unknown[]) => mockExecuteSyncPipeline(...args),
}));

const mockClassifyIssueBackground = vi.fn();
vi.mock("../../src/actions/classify", () => ({
  classifyIssueBackground: (...args: unknown[]) => mockClassifyIssueBackground(...args),
}));

const mockCountUserbackIssues = vi.fn();
const mockGetUserbackSyncCursor = vi.fn();
vi.mock("@repo/database/queries/issues", () => ({
  countUserbackIssues: (...args: unknown[]) => mockCountUserbackIssues(...args),
  getUserbackSyncCursor: (...args: unknown[]) => mockGetUserbackSyncCursor(...args),
}));

const mockExtractMediaFromMetadata = vi.fn();
vi.mock("@repo/database/integrations/userback", () => ({
  extractMediaFromMetadata: (...args: unknown[]) => mockExtractMediaFromMetadata(...args),
}));

const mockStoreIssueMedia = vi.fn();
vi.mock("@repo/database/mutations/issue-attachments", () => ({
  storeIssueMedia: (...args: unknown[]) => mockStoreIssueMedia(...args),
}));

// Mock getAdminClient for backfillMedia
const mockAdminFrom = vi.fn();
vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: () => ({
    from: mockAdminFrom,
  }),
}));

describeWithDb("Import Actions (integration)")("Import Actions (integration)", () => {
  beforeEach(() => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    mockExecuteSyncPipeline.mockReset();
    mockClassifyIssueBackground.mockReset();
    mockCountUserbackIssues.mockReset();
    mockGetUserbackSyncCursor.mockReset();
    mockExtractMediaFromMetadata.mockReset();
    mockStoreIssueMedia.mockReset();
    mockAdminFrom.mockReset();
  });

  describe("syncUserback", () => {
    async function getAction() {
      const mod = await import("../../src/actions/import");
      return mod.syncUserback;
    }

    it("returns success with imported, updated, skipped, classified counts", async () => {
      mockExecuteSyncPipeline.mockResolvedValue({
        importedIds: ["id-1", "id-2"],
        imported: 2,
        updated: 1,
        skipped: 0,
        total: 3,
        isInitial: true,
        errors: [],
      });
      mockClassifyIssueBackground.mockResolvedValue(undefined);

      const action = await getAction();
      const result = await action({
        projectId: TEST_IDS.project,
        limit: 10,
      });

      expect(result).toHaveProperty("success", true);
      if ("data" in result) {
        expect(result.data.imported).toBe(2);
        expect(result.data.updated).toBe(1);
        expect(result.data.classified).toBe(2);
        expect(result.data.isInitial).toBe(true);
      }
    });

    it("classifies new imports sequentially", async () => {
      mockExecuteSyncPipeline.mockResolvedValue({
        importedIds: ["id-1", "id-2"],
        imported: 2,
        updated: 0,
        skipped: 0,
        total: 2,
        isInitial: false,
        errors: [],
      });
      mockClassifyIssueBackground.mockResolvedValue(undefined);

      const action = await getAction();
      await action({ projectId: TEST_IDS.project });

      expect(mockClassifyIssueBackground).toHaveBeenCalledTimes(2);
      expect(mockClassifyIssueBackground).toHaveBeenCalledWith("id-1");
      expect(mockClassifyIssueBackground).toHaveBeenCalledWith("id-2");
    });

    it("revalidates issues and import paths", async () => {
      mockExecuteSyncPipeline.mockResolvedValue({
        importedIds: [],
        imported: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        isInitial: false,
        errors: [],
      });

      const action = await getAction();
      await action({ projectId: TEST_IDS.project });

      const paths = getRevalidatePathCalls();
      expect(paths).toContain("/issues");
      expect(paths).toContain("/settings/import");
    });

    it("returns error without auth", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({ projectId: TEST_IDS.project });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });

    it("returns error on invalid input", async () => {
      const action = await getAction();
      const result = await action({ projectId: "not-uuid" } as never);

      expect(result).toHaveProperty("error");
    });
  });

  describe("getSyncStatus", () => {
    async function getAction() {
      const mod = await import("../../src/actions/import");
      return mod.getSyncStatus;
    }

    it("returns itemCount and lastSyncCursor", async () => {
      mockCountUserbackIssues.mockResolvedValue(42);
      mockGetUserbackSyncCursor.mockResolvedValue("2026-04-10T12:00:00Z");

      const action = await getAction();
      const result = await action(TEST_IDS.project);

      expect(result).toEqual({
        itemCount: 42,
        lastSyncCursor: "2026-04-10T12:00:00Z",
      });
    });

    it("returns null cursor when no syncs yet", async () => {
      mockCountUserbackIssues.mockResolvedValue(0);
      mockGetUserbackSyncCursor.mockResolvedValue(null);

      const action = await getAction();
      const result = await action(TEST_IDS.project);

      expect(result.lastSyncCursor).toBeNull();
      expect(result.itemCount).toBe(0);
    });
  });

  describe("backfillMedia", () => {
    async function getAction() {
      const mod = await import("../../src/actions/import");
      return mod.backfillMedia;
    }

    it("returns success when no issues found", async () => {
      mockAdminFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }));

      const action = await getAction();
      const result = await action();

      expect(result).toHaveProperty("success", true);
      if ("data" in result) {
        expect(result.data.processed).toBe(0);
      }
    });

    it("returns error without auth", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action();

      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });
});
