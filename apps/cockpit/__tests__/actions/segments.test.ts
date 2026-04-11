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

const mockLinkSegmentToProject = vi.fn();
const mockRemoveSegmentTag = vi.fn();
vi.mock("@repo/database/mutations/meeting-project-summaries", () => ({
  linkSegmentToProject: (...args: unknown[]) => mockLinkSegmentToProject(...args),
  removeSegmentTag: (...args: unknown[]) => mockRemoveSegmentTag(...args),
}));

const mockUpdateProjectAliases = vi.fn();
vi.mock("@repo/database/mutations/projects", () => ({
  updateProjectAliases: (...args: unknown[]) => mockUpdateProjectAliases(...args),
}));

const mockAddIgnoredEntity = vi.fn();
vi.mock("@repo/database/mutations/ignored-entities", () => ({
  addIgnoredEntity: (...args: unknown[]) => mockAddIgnoredEntity(...args),
}));

// Mock getAdminClient to return a controlled Supabase-like object
const mockAdminFrom = vi.fn();
vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: () => ({
    from: mockAdminFrom,
  }),
}));

function setupAdminMock(
  segmentName: string | null,
  aliases: string[] = [],
  orgId: string | null = null,
) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "meeting_project_summaries") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: segmentName ? { project_name_raw: segmentName } : null,
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "projects") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { aliases },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "meetings") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: orgId },
              error: null,
            }),
          }),
        }),
      };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });
}

describeWithDb("Segments Actions (integration)")("Segments Actions (integration)", () => {
  beforeEach(() => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    mockLinkSegmentToProject.mockReset();
    mockRemoveSegmentTag.mockReset();
    mockUpdateProjectAliases.mockReset();
    mockAddIgnoredEntity.mockReset();
    mockAdminFrom.mockReset();
  });

  describe("linkSegmentToProjectAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/segments");
      return mod.linkSegmentToProjectAction;
    }

    it("links segment to project and auto-adds alias", async () => {
      setupAdminMock("Custom Project Name", ["Existing Alias"]);
      mockLinkSegmentToProject.mockResolvedValue({ success: true });
      mockUpdateProjectAliases.mockResolvedValue({ success: true });

      const action = await getAction();
      const result = await action({
        segmentId: TEST_IDS.extraction,
        projectId: TEST_IDS.project,
        meetingId: TEST_IDS.meeting,
      });

      expect(result).toEqual({ success: true });
      expect(mockLinkSegmentToProject).toHaveBeenCalledWith(TEST_IDS.extraction, TEST_IDS.project);
      expect(mockUpdateProjectAliases).toHaveBeenCalledWith(TEST_IDS.project, [
        "Existing Alias",
        "Custom Project Name",
      ]);
    });

    it("does not add duplicate alias", async () => {
      setupAdminMock("Existing Alias", ["Existing Alias"]);
      mockLinkSegmentToProject.mockResolvedValue({ success: true });

      const action = await getAction();
      await action({
        segmentId: TEST_IDS.extraction,
        projectId: TEST_IDS.project,
        meetingId: TEST_IDS.meeting,
      });

      // Should NOT call updateProjectAliases because alias already exists
      expect(mockUpdateProjectAliases).not.toHaveBeenCalled();
    });

    it("revalidates review and meeting paths", async () => {
      setupAdminMock(null);
      mockLinkSegmentToProject.mockResolvedValue({ success: true });

      const action = await getAction();
      await action({
        segmentId: TEST_IDS.extraction,
        projectId: TEST_IDS.project,
        meetingId: TEST_IDS.meeting,
      });

      const paths = getRevalidatePathCalls();
      expect(paths).toContain(`/review/${TEST_IDS.meeting}`);
      expect(paths).toContain(`/meetings/${TEST_IDS.meeting}`);
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        segmentId: TEST_IDS.extraction,
        projectId: TEST_IDS.project,
        meetingId: TEST_IDS.meeting,
      });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });

    it("returns error on invalid input", async () => {
      const action = await getAction();
      const result = await action({
        segmentId: "not-uuid",
        projectId: TEST_IDS.project,
        meetingId: TEST_IDS.meeting,
      } as never);

      expect(result).toHaveProperty("error");
    });
  });

  describe("removeSegmentTagAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/segments");
      return mod.removeSegmentTagAction;
    }

    it("removes tag and adds to ignored entities", async () => {
      setupAdminMock("Ignored Name", [], TEST_IDS.organization);
      mockRemoveSegmentTag.mockResolvedValue({ success: true });
      mockAddIgnoredEntity.mockResolvedValue({ success: true });

      const action = await getAction();
      const result = await action({
        segmentId: TEST_IDS.extraction,
        meetingId: TEST_IDS.meeting,
      });

      expect(result).toEqual({ success: true });
      expect(mockRemoveSegmentTag).toHaveBeenCalledWith(TEST_IDS.extraction, TEST_IDS.meeting);
      expect(mockAddIgnoredEntity).toHaveBeenCalledWith(
        TEST_IDS.organization,
        "Ignored Name",
        "project",
      );
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        segmentId: TEST_IDS.extraction,
        meetingId: TEST_IDS.meeting,
      });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });
});
