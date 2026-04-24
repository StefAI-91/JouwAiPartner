import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAuthenticated, mockUnauthenticated, createServerMock } from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks, getRevalidatePathCalls } from "../helpers/mock-next";

// RFC 4122 compliant UUIDs for unit tests (Zod 4 validates variant bits)
const IDS = {
  userId: "00000000-0000-4000-8000-000000000099",
  segment: "00000000-0000-4000-8000-000000000005",
  project: "00000000-0000-4000-8000-000000000002",
  meeting: "00000000-0000-4000-8000-000000000004",
  organization: "00000000-0000-4000-8000-000000000001",
};

vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createServerMock());
vi.mock("@repo/auth/access", () => ({
  isAdmin: vi.fn().mockResolvedValue(true),
}));

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

// Q2b-B: actions roepen nu helpers aan i.p.v. directe Supabase chains.
// Mocks zitten nu op de helpergrens (queries/*) zoals CLAUDE.md voorschrijft
// — de oude chainable .from(...) mocks zijn verwijderd omdat ze
// implementatie-specifiek waren (forbidden bij nieuwe tests).
const mockGetSegmentNameRaw = vi.fn();
vi.mock("@repo/database/queries/meetings/project-summaries", () => ({
  getSegmentNameRaw: (...args: unknown[]) => mockGetSegmentNameRaw(...args),
}));

const mockGetMeetingOrganizationId = vi.fn();
vi.mock("@repo/database/queries/meetings", () => ({
  getMeetingOrganizationId: (...args: unknown[]) => mockGetMeetingOrganizationId(...args),
}));

const mockGetProjectAliases = vi.fn();
vi.mock("@repo/database/queries/projects", () => ({
  getProjectAliases: (...args: unknown[]) => mockGetProjectAliases(...args),
}));

describe("Segments Actions", () => {
  beforeEach(() => {
    mockAuthenticated(IDS.userId);
    resetNextMocks();
    mockLinkSegmentToProject.mockReset();
    mockRemoveSegmentTag.mockReset();
    mockUpdateProjectAliases.mockReset();
    mockAddIgnoredEntity.mockReset();
    mockGetSegmentNameRaw.mockReset();
    mockGetMeetingOrganizationId.mockReset();
    mockGetProjectAliases.mockReset();
  });

  describe("linkSegmentToProjectAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/segments");
      return mod.linkSegmentToProjectAction;
    }

    it("links segment to project and auto-adds alias", async () => {
      mockGetSegmentNameRaw.mockResolvedValue("Custom Project Name");
      mockGetProjectAliases.mockResolvedValue(["Existing Alias"]);
      mockLinkSegmentToProject.mockResolvedValue({ success: true });
      mockUpdateProjectAliases.mockResolvedValue({ success: true });

      const action = await getAction();
      const result = await action({
        segmentId: IDS.segment,
        projectId: IDS.project,
        meetingId: IDS.meeting,
      });

      expect(result).toEqual({ success: true });
      expect(mockLinkSegmentToProject).toHaveBeenCalledWith(IDS.segment, IDS.project);
      expect(mockUpdateProjectAliases).toHaveBeenCalledWith(IDS.project, [
        "Existing Alias",
        "Custom Project Name",
      ]);
    });

    it("does not add duplicate alias", async () => {
      mockGetSegmentNameRaw.mockResolvedValue("Existing Alias");
      mockGetProjectAliases.mockResolvedValue(["Existing Alias"]);
      mockLinkSegmentToProject.mockResolvedValue({ success: true });

      const action = await getAction();
      await action({
        segmentId: IDS.segment,
        projectId: IDS.project,
        meetingId: IDS.meeting,
      });

      // Should NOT call updateProjectAliases because alias already exists
      expect(mockUpdateProjectAliases).not.toHaveBeenCalled();
    });

    it("revalidates review and meeting paths", async () => {
      mockGetSegmentNameRaw.mockResolvedValue(null);
      mockLinkSegmentToProject.mockResolvedValue({ success: true });

      const action = await getAction();
      await action({
        segmentId: IDS.segment,
        projectId: IDS.project,
        meetingId: IDS.meeting,
      });

      const paths = getRevalidatePathCalls();
      expect(paths).toContain(`/review/${IDS.meeting}`);
      expect(paths).toContain(`/meetings/${IDS.meeting}`);
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        segmentId: IDS.segment,
        projectId: IDS.project,
        meetingId: IDS.meeting,
      });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });

    it("returns error on invalid input", async () => {
      const action = await getAction();
      const result = await action({
        segmentId: "not-uuid",
        projectId: IDS.project,
        meetingId: IDS.meeting,
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
      mockGetSegmentNameRaw.mockResolvedValue("Ignored Name");
      mockGetMeetingOrganizationId.mockResolvedValue(IDS.organization);
      mockRemoveSegmentTag.mockResolvedValue({ success: true });
      mockAddIgnoredEntity.mockResolvedValue({ success: true });

      const action = await getAction();
      const result = await action({
        segmentId: IDS.segment,
        meetingId: IDS.meeting,
      });

      expect(result).toEqual({ success: true });
      expect(mockRemoveSegmentTag).toHaveBeenCalledWith(IDS.segment, IDS.meeting);
      expect(mockAddIgnoredEntity).toHaveBeenCalledWith(
        IDS.organization,
        "Ignored Name",
        "project",
      );
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        segmentId: IDS.segment,
        meetingId: IDS.meeting,
      });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });
});
