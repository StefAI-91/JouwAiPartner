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
const mockGetProfileEmail = vi.fn();
const mockListUsers = vi.fn();
const mockInviteUserByEmail = vi.fn();
const mockNotifyPortalAccessGranted = vi.fn();

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
  getProfileEmail: (...args: unknown[]) => mockGetProfileEmail(...args),
}));

vi.mock("@repo/notifications", () => ({
  notifyPortalAccessGranted: (...args: unknown[]) => mockNotifyPortalAccessGranted(...args),
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
  mockNotifyPortalAccessGranted.mockResolvedValue(undefined);
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

  it("grant access voor member zonder rol-wijziging + stuurt access-mail", async () => {
    mockGetProfileRole.mockResolvedValueOnce("member");
    mockGetProfileEmail.mockResolvedValueOnce("member@jouwai.nl");
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
    // Member krijgt notify-mail dat ze toegang hebben.
    expect(mockNotifyPortalAccessGranted).toHaveBeenCalledWith(
      { to: "member@jouwai.nl", projectId: PROJECT_ID },
      expect.anything(),
    );
  });

  it("admin krijgt geen self-notify mail (admins zien al alles)", async () => {
    mockGetProfileRole.mockResolvedValueOnce("admin");
    mockGrantPortalAccess.mockResolvedValueOnce({
      success: true,
      data: { id: "row-1", profile_id: ADMIN_ID, project_id: PROJECT_ID },
    });

    await grantMemberPortalAccessAction({ profileId: ADMIN_ID, projectId: PROJECT_ID });

    expect(mockGrantPortalAccess).toHaveBeenCalled();
    expect(mockNotifyPortalAccessGranted).not.toHaveBeenCalled();
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
  it("bestaande member krijgt portal-access zonder rol-wijziging + access-mail", async () => {
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
    // Wél een access-mail via Resend zodat de gebruiker weet dat ze toegang hebben.
    expect(mockNotifyPortalAccessGranted).toHaveBeenCalledWith(
      { to: "stef@jouwai.nl", projectId: PROJECT_ID },
      expect.anything(),
    );
  });

  it("bestaande client krijgt access-mail (kernfix: voorheen geen signaal)", async () => {
    const CLIENT_ID = "00000000-0000-4000-8000-0000000000cc";
    mockListUsers.mockResolvedValueOnce({
      data: { users: [{ id: CLIENT_ID, email: "info@flowwijs.nl" }] },
    });
    mockGetProfileRole.mockResolvedValueOnce("client");
    mockGrantPortalAccess.mockResolvedValueOnce({
      success: true,
      data: { id: "row-3", profile_id: CLIENT_ID, project_id: PROJECT_ID },
    });

    const result = await inviteProjectClientAction({
      email: "info@flowwijs.nl",
      projectId: PROJECT_ID,
    });

    expect(result).toEqual({
      success: true,
      data: { profileId: CLIENT_ID, invitedFresh: false },
    });
    expect(mockInviteUserByEmail).not.toHaveBeenCalled();
    expect(mockNotifyPortalAccessGranted).toHaveBeenCalledWith(
      { to: "info@flowwijs.nl", projectId: PROJECT_ID },
      expect.anything(),
    );
  });

  it("fresh user (Supabase invite-pad) krijgt geen aparte access-mail (Supabase Auth stuurt zelf)", async () => {
    const NEW_ID = "00000000-0000-4000-8000-0000000000ff";
    mockListUsers.mockResolvedValueOnce({ data: { users: [] } });
    mockInviteUserByEmail.mockResolvedValueOnce({
      data: { user: { id: NEW_ID } },
      error: null,
    });
    mockUpsertProfile.mockResolvedValueOnce({ success: true, data: { id: NEW_ID } });
    mockGrantPortalAccess.mockResolvedValueOnce({
      success: true,
      data: { id: "row-4", profile_id: NEW_ID, project_id: PROJECT_ID },
    });

    const result = await inviteProjectClientAction({
      email: "nieuw@klant.nl",
      projectId: PROJECT_ID,
    });

    expect(result).toEqual({
      success: true,
      data: { profileId: NEW_ID, invitedFresh: true },
    });
    expect(mockInviteUserByEmail).toHaveBeenCalled();
    // Fresh-user-pad: Supabase Auth stuurt al een invite-mail, geen dubbele Resend-mail.
    expect(mockNotifyPortalAccessGranted).not.toHaveBeenCalled();
  });
});
