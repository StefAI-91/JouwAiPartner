import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { describeWithDb } from "../../database/__tests__/helpers/describe-with-db";
import { getTestClient } from "../../database/__tests__/helpers/test-client";
import {
  seedProfile,
  seedOrganization,
  seedProject,
  TEST_IDS,
} from "../../database/__tests__/helpers/seed";
import { cleanupTestData, cleanupTestProfile } from "../../database/__tests__/helpers/cleanup";
import {
  isAdmin,
  assertProjectAccess,
  listAccessibleProjectIds,
  NotAuthorizedError,
} from "../src/access";

const UNKNOWN_USER_ID = "00000000-0000-0000-0000-000000999999";
const UNKNOWN_PROJECT_ID = "00000000-0000-0000-0000-000000999998";

describeWithDb("auth/access (integration)", () => {
  let db: ReturnType<typeof getTestClient>;
  let guardianAdminId: string;
  let testAdminId: string;
  let testMemberId: string;

  beforeAll(async () => {
    db = getTestClient();

    await cleanupTestData();

    // Guardian admin persists across runs so cleanup of test-admin never hits
    // the min-1-admin trigger. Email is stable so seedProfile is idempotent.
    const guardian = await seedProfile({
      email: "guardian-admin@test.local",
      full_name: "Guardian Admin",
    });
    guardianAdminId = guardian.id;

    const admin = await seedProfile({
      email: "test-admin@test.local",
      full_name: "Test Admin",
    });
    testAdminId = admin.id;

    const member = await seedProfile({
      email: "test-member@test.local",
      full_name: "Test Member",
    });
    testMemberId = member.id;

    const { error: promoteError } = await db
      .from("profiles")
      .update({ role: "admin" })
      .in("id", [guardianAdminId, testAdminId]);
    if (promoteError) throw new Error(`promote admins: ${promoteError.message}`);

    await db.from("profiles").update({ role: "member" }).eq("id", testMemberId);

    await seedOrganization();
    await seedProject();
    await seedProject({ id: TEST_IDS.project2, name: "Second Project" });

    await db.from("devhub_project_access").delete().eq("profile_id", testMemberId);
    const { error: accessError } = await db
      .from("devhub_project_access")
      .insert({ profile_id: testMemberId, project_id: TEST_IDS.project });
    if (accessError) throw new Error(`seed access: ${accessError.message}`);
  });

  afterAll(async () => {
    await db.from("devhub_project_access").delete().eq("profile_id", testMemberId);
    // Demote test admin so deleting its auth row never trips the
    // min-1-admin guard (guardian keeps the admin role alive).
    await db.from("profiles").update({ role: "member" }).eq("id", testAdminId);

    await cleanupTestProfile(testAdminId);
    await cleanupTestProfile(testMemberId);
    await cleanupTestData();
    // Guardian admin intentionally retained for future runs.
  });

  describe("isAdmin()", () => {
    it("returns true for admin profile", async () => {
      expect(await isAdmin(testAdminId, db)).toBe(true);
    });

    it("returns false for member profile", async () => {
      expect(await isAdmin(testMemberId, db)).toBe(false);
    });

    it("returns false for unknown userId", async () => {
      expect(await isAdmin(UNKNOWN_USER_ID, db)).toBe(false);
    });

    it("returns false for null/undefined/empty userId (default-deny)", async () => {
      expect(await isAdmin(null, db)).toBe(false);
      expect(await isAdmin(undefined, db)).toBe(false);
      expect(await isAdmin("", db)).toBe(false);
    });
  });

  describe("assertProjectAccess()", () => {
    it("resolves for admin without any access row", async () => {
      await expect(
        assertProjectAccess(testAdminId, TEST_IDS.project2, db),
      ).resolves.toBeUndefined();
    });

    it("resolves for member with matching access row", async () => {
      await expect(
        assertProjectAccess(testMemberId, TEST_IDS.project, db),
      ).resolves.toBeUndefined();
    });

    it("throws NotAuthorizedError for member without access row", async () => {
      await expect(assertProjectAccess(testMemberId, TEST_IDS.project2, db)).rejects.toBeInstanceOf(
        NotAuthorizedError,
      );
    });

    it("throws for missing userId (default-deny)", async () => {
      await expect(assertProjectAccess(null, TEST_IDS.project, db)).rejects.toBeInstanceOf(
        NotAuthorizedError,
      );
      await expect(assertProjectAccess(undefined, TEST_IDS.project, db)).rejects.toBeInstanceOf(
        NotAuthorizedError,
      );
    });

    it("throws for unknown project combination", async () => {
      await expect(
        assertProjectAccess(testMemberId, UNKNOWN_PROJECT_ID, db),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("listAccessibleProjectIds()", () => {
    it("returns all project ids for admin", async () => {
      const ids = await listAccessibleProjectIds(testAdminId, db);
      expect(ids).toContain(TEST_IDS.project);
      expect(ids).toContain(TEST_IDS.project2);
    });

    it("returns only granted ids for member", async () => {
      const ids = await listAccessibleProjectIds(testMemberId, db);
      expect(ids).toEqual([TEST_IDS.project]);
    });

    it("returns empty array for unknown user (no bootstrap fallback)", async () => {
      const ids = await listAccessibleProjectIds(UNKNOWN_USER_ID, db);
      expect(ids).toEqual([]);
    });

    it("returns empty array for null/undefined userId", async () => {
      expect(await listAccessibleProjectIds(null, db)).toEqual([]);
      expect(await listAccessibleProjectIds(undefined, db)).toEqual([]);
    });
  });
});
