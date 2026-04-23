import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAuthenticated, mockUnauthenticated } from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks } from "../helpers/mock-next";

vi.mock("next/cache", () => createNextCacheMock());

// Auth boundary — getAuthenticatedUser reads the mockAuthenticated() state.
vi.mock("@repo/database/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => {
        // Import lazily to avoid circularity; helper maintains a closure var.
        const { getMockUser } = await import("../helpers/mock-auth");
        return { data: { user: getMockUser() }, error: null };
      }),
    },
  })),
}));

// Access boundary — we drive this explicitly per-test to exercise both
// happy path and NotAuthorizedError (info-leak guard).
class NotAuthorizedError extends Error {
  constructor() {
    super("NotAuthorizedError");
    this.name = "NotAuthorizedError";
  }
}
const mockAssertProjectAccess = vi.fn();
vi.mock("@repo/auth/access", () => ({
  NotAuthorizedError,
  assertProjectAccess: (...args: unknown[]) => mockAssertProjectAccess(...args),
}));

// Data boundary.
const mockGetIssueById = vi.fn();
vi.mock("@repo/database/queries/issues", () => ({
  getIssueById: (...args: unknown[]) => mockGetIssueById(...args),
}));

const mockInsertAttachment = vi.fn();
vi.mock("@repo/database/mutations/issue-attachments", () => ({
  insertAttachment: (...args: unknown[]) => mockInsertAttachment(...args),
}));

// Admin-client boundary — we capture the path that gets handed to
// `createSignedUploadUrl` so we can assert shape without hitting Supabase.
const mockCreateSignedUploadUrl = vi.fn();
vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: () => ({
    storage: {
      from: (_bucket: string) => ({
        createSignedUploadUrl: (path: string) => mockCreateSignedUploadUrl(path),
      }),
    },
  }),
}));

const USER_ID = "aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa";
const ISSUE_ID = "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb";
const PROJECT_ID = "cccccccc-cccc-4ccc-9ccc-cccccccccccc";

describe("attachment actions", () => {
  beforeEach(() => {
    mockAuthenticated(USER_ID);
    resetNextMocks();
    mockAssertProjectAccess.mockReset();
    mockGetIssueById.mockReset();
    mockInsertAttachment.mockReset();
    mockCreateSignedUploadUrl.mockReset();
  });

  describe("recordIssueAttachmentAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/attachments");
      return mod.recordIssueAttachmentAction;
    }

    const validInput = {
      issue_id: ISSUE_ID,
      type: "screenshot" as const,
      storage_path: `issues/${ISSUE_ID}/1700000000000-screenshot.png`,
      file_name: "screenshot.png",
      mime_type: "image/png",
      file_size: 1024,
      width: 800,
      height: 600,
    };

    it("persists the attachment on the happy path", async () => {
      mockAssertProjectAccess.mockResolvedValue(undefined);
      mockGetIssueById.mockResolvedValue({ id: ISSUE_ID, project_id: PROJECT_ID });
      mockInsertAttachment.mockResolvedValue(undefined);

      const action = await getAction();
      const result = await action(validInput);

      expect(result).toEqual({ success: true });
      expect(mockInsertAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_id: ISSUE_ID,
          storage_path: validInput.storage_path,
          file_name: "screenshot.png",
          mime_type: "image/png",
          file_size: 1024,
          width: 800,
          height: 600,
          original_url: null,
        }),
      );
    });

    it("rejects a path that isn't prefixed with issues/<id>/", async () => {
      // This is the defense-in-depth path-prefix guard. Must refuse to
      // persist even if auth + access checks pass — otherwise a tampered
      // client could associate an arbitrary uploaded blob with this issue.
      mockAssertProjectAccess.mockResolvedValue(undefined);
      mockGetIssueById.mockResolvedValue({ id: ISSUE_ID, project_id: PROJECT_ID });

      const action = await getAction();
      const result = await action({
        ...validInput,
        storage_path: "issues/other-issue/escape.png",
      });

      expect(result).toEqual({ error: "Ongeldig pad voor bijlage" });
      expect(mockInsertAttachment).not.toHaveBeenCalled();
    });

    it("returns error when the user is not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action(validInput);

      expect(result).toEqual({ error: "Niet ingelogd" });
      expect(mockGetIssueById).not.toHaveBeenCalled();
      expect(mockInsertAttachment).not.toHaveBeenCalled();
    });

    it("returns 'Issue niet gevonden' when the issue does not exist", async () => {
      mockGetIssueById.mockResolvedValue(null);
      const action = await getAction();
      const result = await action(validInput);

      expect(result).toEqual({ error: "Issue niet gevonden" });
      expect(mockInsertAttachment).not.toHaveBeenCalled();
    });

    it("surfaces 'Issue niet gevonden' (not 'Geen toegang') on access-denied (info-leak guard)", async () => {
      mockGetIssueById.mockResolvedValue({ id: ISSUE_ID, project_id: PROJECT_ID });
      mockAssertProjectAccess.mockRejectedValue(new NotAuthorizedError());

      const action = await getAction();
      const result = await action(validInput);

      // Returning "niet gevonden" keeps the existence of this issue id private
      // — clients without access can't probe which ids are real.
      expect(result).toEqual({ error: "Issue niet gevonden" });
      expect(mockInsertAttachment).not.toHaveBeenCalled();
    });
  });

  describe("createIssueAttachmentUploadUrlAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/attachments");
      return mod.createIssueAttachmentUploadUrlAction;
    }

    it("returns a signed upload URL on the happy path", async () => {
      mockAssertProjectAccess.mockResolvedValue(undefined);
      mockGetIssueById.mockResolvedValue({ id: ISSUE_ID, project_id: PROJECT_ID });
      mockCreateSignedUploadUrl.mockResolvedValue({
        data: { signedUrl: "https://example.test/signed", token: "tok-123" },
        error: null,
      });

      const action = await getAction();
      const result = await action({ issue_id: ISSUE_ID, file_name: "my photo.png" });

      expect(result).toMatchObject({
        success: true,
        signed_url: "https://example.test/signed",
        token: "tok-123",
      });
      if (!("success" in result)) throw new Error("expected success");
      // The path the client must use to upload — must live under the issue folder
      // so the record action's prefix guard accepts it afterwards.
      expect(result.storage_path.startsWith(`issues/${ISSUE_ID}/`)).toBe(true);
      // Filename was sanitized: the space became a dash, no raw spaces remain.
      expect(result.storage_path).not.toContain(" ");
    });

    it("returns error when the user is not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({ issue_id: ISSUE_ID, file_name: "x.png" });

      expect(result).toEqual({ error: "Niet ingelogd" });
      expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
    });

    it("returns 'Issue niet gevonden' on access-denied (info-leak guard)", async () => {
      mockGetIssueById.mockResolvedValue({ id: ISSUE_ID, project_id: PROJECT_ID });
      mockAssertProjectAccess.mockRejectedValue(new NotAuthorizedError());

      const action = await getAction();
      const result = await action({ issue_id: ISSUE_ID, file_name: "x.png" });

      expect(result).toEqual({ error: "Issue niet gevonden" });
      expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
    });

    it("surfaces storage errors as a generic message (no raw Supabase error leakage)", async () => {
      mockAssertProjectAccess.mockResolvedValue(undefined);
      mockGetIssueById.mockResolvedValue({ id: ISSUE_ID, project_id: PROJECT_ID });
      mockCreateSignedUploadUrl.mockResolvedValue({
        data: null,
        error: { message: "internal storage oops" },
      });

      const action = await getAction();
      const result = await action({ issue_id: ISSUE_ID, file_name: "x.png" });

      expect(result).toEqual({ error: "Upload-URL genereren mislukt" });
    });
  });
});
