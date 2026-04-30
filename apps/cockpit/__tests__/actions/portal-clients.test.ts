import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * PR-024 — Tests voor de cockpit portal-access actions.
 *
 * Mock-grens: auth + DB-helpers (queries/team, mutations/portal-access,
 * mutations/team) + next/cache. We asserteren op admin-guard, Zod-validatie,
 * idempotency en dat members hun rol behouden bij grant.
 */

const mockUser = { value: null as { id: string; email: string } | null };
const mockIsAdmin = vi.fn<(userId: string) => Promise<boolean>>();
const mockGrantPortalAccess = vi.fn();
const mockRevokePortalAccess = vi.fn();
const mockUpsertProfile = vi.fn();
const mockGetProfileRole = vi.fn();
const mockListUsers = vi.fn();
const mockInviteUserByEmail = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@repo/auth/helpers", () => ({
  getAuthenticatedUser: vi.fn(async () => mockUser.value),
}));

vi.mock("@repo/auth/access", () => ({
  requireAdminInAction: async () => {
    if (!mockUser.value?.id) return { error: "Niet ingelogd" };
    if (!(await mockIsAdmin(mockUser.value.id))) return { error: "Geen toegang" };
    return { user: { id: mockUser.value.id, email: mockUser.value.email ?? "" } };
  },
  isAdmin: (...args: [string]) => mockIsAdmin(...args),
}));

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: () => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => mockListUsers(...args),
        inviteUserByEmail: (...args: unknown[]) => mockInviteUserByEmail(...args),
      },
    },
  }),
}));

vi.mock("@repo/database/mutations/portal-access", () => ({
  grantPortalAccess: (...args: unknown[]) => mockGrantPortalAccess(...args),
  revokePortalAccess: (...args: unknown[]) => mockRevokePortalAccess(...args),
}));

vi.mock("@repo/database/mutations/team", () => ({
  upsertProfile: (...args: unknown[]) => mockUpsertProfile(...args),
}));

vi.mock("@repo/database/queries/team", () => ({
  getProfileRole: (...args: unknown[]) => mockGetProfileRole(...args),
}));

import {
  grantMemberPortalAccessAction,
  inviteProjectClientAction,
} from "../../src/features/projects/actions/clients";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const MEMBER_ID = "00000000-0000-4000-8000-000000000010";
const ADMIN_ID = "00000000-0000-4000-8000-0000000000aa";

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.value = { id: ADMIN_ID, email: "admin@jouwai.nl" };
  mockIsAdmin.mockResolvedValue(true);
});

describe("grantMemberPortalAccessAction", () => {
  it("blokkeert non-admin callers", async () => {
    mockIsAdmin.mockResolvedValueOnce(false);

    const result = await grantMemberPortalAccessAction({
      profileId: MEMBER_ID,
      projectId: PROJECT_ID,
    });

    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockGrantPortalAccess).not.toHaveBeenCalled();
  });

  it("Zod faalt op ongeldige profileId", async () => {
    const result = await grantMemberPortalAccessAction({
      profileId: "not-a-uuid",
      projectId: PROJECT_ID,
    });

    expect("error" in result).toBe(true);
    expect(mockGrantPortalAccess).not.toHaveBeenCalled();
  });

  it("blokkeert wanneer profileId een client is (gebruik invite-flow)", async () => {
    mockGetProfileRole.mockResolvedValueOnce("client");

    const result = await grantMemberPortalAccessAction({
      profileId: MEMBER_ID,
      projectId: PROJECT_ID,
    });

    expect("error" in result).toBe(true);
    expect(mockGrantPortalAccess).not.toHaveBeenCalled();
  });

  it("grant access voor member zonder rol-wijziging", async () => {
    mockGetProfileRole.mockResolvedValueOnce("member");
    mockGrantPortalAccess.mockResolvedValueOnce({
      success: true,
      data: { id: "row-1", profile_id: MEMBER_ID, project_id: PROJECT_ID },
    });

    const result = await grantMemberPortalAccessAction({
      profileId: MEMBER_ID,
      projectId: PROJECT_ID,
    });

    expect(result).toEqual({ success: true, data: { profileId: MEMBER_ID } });
    expect(mockGrantPortalAccess).toHaveBeenCalledWith(MEMBER_ID, PROJECT_ID, expect.anything());
    // Geen rol-wijziging — upsertProfile mag NIET zijn aangeroepen.
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it("idempotent: tweede call met zelfde paar levert nog steeds success", async () => {
    mockGetProfileRole.mockResolvedValue("member");
    mockGrantPortalAccess.mockResolvedValue({
      success: true,
      data: { id: "row-1", profile_id: MEMBER_ID, project_id: PROJECT_ID },
    });

    const r1 = await grantMemberPortalAccessAction({
      profileId: MEMBER_ID,
      projectId: PROJECT_ID,
    });
    const r2 = await grantMemberPortalAccessAction({
      profileId: MEMBER_ID,
      projectId: PROJECT_ID,
    });

    expect(r1).toEqual({ success: true, data: { profileId: MEMBER_ID } });
    expect(r2).toEqual({ success: true, data: { profileId: MEMBER_ID } });
  });
});

describe("inviteProjectClientAction (PR-024 — member-block weg)", () => {
  it("bestaande member krijgt portal-access zonder rol-wijziging", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: { users: [{ id: MEMBER_ID, email: "stef@jouwai.nl" }] },
    });
    mockGetProfileRole.mockResolvedValueOnce("member");
    mockGrantPortalAccess.mockResolvedValueOnce({
      success: true,
      data: { id: "row-2", profile_id: MEMBER_ID, project_id: PROJECT_ID },
    });

    const result = await inviteProjectClientAction({
      email: "stef@jouwai.nl",
      projectId: PROJECT_ID,
    });

    expect(result).toEqual({
      success: true,
      data: { profileId: MEMBER_ID, invitedFresh: false },
    });
    expect(mockGrantPortalAccess).toHaveBeenCalledWith(MEMBER_ID, PROJECT_ID, expect.anything());
    // Member-block weg → geen "is een teamlid" error meer.
    expect(mockUpsertProfile).not.toHaveBeenCalled();
    // Geen invite-mail voor bestaande gebruikers.
    expect(mockInviteUserByEmail).not.toHaveBeenCalled();
  });
});
