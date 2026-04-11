import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  seedOrganization,
  seedProject,
  seedPerson,
  seedProfile,
  seedGoogleAccount,
  seedEmail,
  TEST_IDS,
} from "../helpers/seed";
import { cleanupTestData, cleanupTestProfile } from "../helpers/cleanup";
import {
  listActiveGoogleAccountsSafe,
  listEmails,
  getEmailById,
  getExistingGmailIds,
  listDraftEmails,
  getUnprocessedEmails,
} from "../../src/queries/emails";

let db: ReturnType<typeof getTestClient>;
let profileId: string;
let googleAccountId: string;

describeWithDb("queries/emails", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    await seedPerson();

    // Create profile and google account for email tests
    const profile = await seedProfile({ full_name: "Email Test User" });
    profileId = profile.id;
    const account = await seedGoogleAccount(profileId);
    googleAccountId = account.id;
  });

  afterEach(async () => {
    await db.from("email_extractions").delete().eq("email_id", TEST_IDS.email);
    await db.from("email_projects").delete().eq("email_id", TEST_IDS.email);
    await db.from("emails").delete().eq("id", TEST_IDS.email);
  });

  afterAll(async () => {
    await db.from("emails").delete().eq("google_account_id", googleAccountId);
    await db.from("google_accounts").delete().eq("id", googleAccountId);
    await cleanupTestProfile(profileId);
    await cleanupTestData();
  });

  describe("listActiveGoogleAccountsSafe()", () => {
    it("returns active accounts without tokens", async () => {
      const result = await listActiveGoogleAccountsSafe(db);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const account = result.find((a) => a.id === googleAccountId);
      expect(account).toBeDefined();
      expect(account!.email).toBe("test-google@test.local");
      expect(account!.is_active).toBe(true);

      // Ensure no tokens are exposed
      const raw = account as Record<string, unknown>;
      expect(raw).not.toHaveProperty("access_token");
      expect(raw).not.toHaveProperty("refresh_token");
    });
  });

  describe("listEmails()", () => {
    it("returns emails with filters and ordering date DESC", async () => {
      await seedEmail(googleAccountId, {
        id: TEST_IDS.email,
        subject: "Important Email",
        verification_status: "draft",
        is_processed: true,
      });

      const { items, count } = await listEmails({
        googleAccountId,
        client: db,
      });

      expect(count).toBeGreaterThanOrEqual(1);
      const email = items.find((e) => e.id === TEST_IDS.email);
      expect(email).toBeDefined();
      expect(email!.subject).toBe("Important Email");
    });

    it("filters on verificationStatus", async () => {
      await seedEmail(googleAccountId, {
        id: TEST_IDS.email,
        verification_status: "verified",
      });

      const { items } = await listEmails({
        verificationStatus: "draft",
        client: db,
      });

      const ids = items.map((e) => e.id);
      expect(ids).not.toContain(TEST_IDS.email);
    });

    it("filters on isProcessed", async () => {
      await seedEmail(googleAccountId, {
        id: TEST_IDS.email,
        is_processed: false,
      });

      const { items } = await listEmails({
        isProcessed: true,
        client: db,
      });

      const ids = items.map((e) => e.id);
      expect(ids).not.toContain(TEST_IDS.email);
    });

    it("respects limit and offset", async () => {
      await seedEmail(googleAccountId, { id: TEST_IDS.email });

      const { items } = await listEmails({
        googleAccountId,
        limit: 1,
        offset: 0,
        client: db,
      });

      expect(items.length).toBeLessThanOrEqual(1);
    });
  });

  describe("getEmailById()", () => {
    it("returns full detail with sender, projects, extractions", async () => {
      await seedEmail(googleAccountId, {
        id: TEST_IDS.email,
        organization_id: TEST_IDS.organization,
        sender_person_id: TEST_IDS.person,
      });

      const result = await getEmailById(TEST_IDS.email, db);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEST_IDS.email);
      expect(result!.organization).not.toBeNull();
      expect(result!.organization!.name).toBe("Test Organization");
      expect(result!.sender_person).not.toBeNull();
      expect(Array.isArray(result!.projects)).toBe(true);
      expect(Array.isArray(result!.extractions)).toBe(true);
    });

    it("returns null for non-existent email", async () => {
      const result = await getEmailById("00000000-0000-0000-0000-ffffffffffff", db);

      expect(result).toBeNull();
    });
  });

  describe("getExistingGmailIds()", () => {
    it("returns Set of existing gmail_ids", async () => {
      const gmailId = `test-gmail-existing-${Date.now()}`;
      await seedEmail(googleAccountId, { id: TEST_IDS.email, gmail_id: gmailId });

      const result = await getExistingGmailIds(googleAccountId, [gmailId, "nonexistent-gmail-id"]);

      expect(result).toBeInstanceOf(Set);
      expect(result.has(gmailId)).toBe(true);
      expect(result.has("nonexistent-gmail-id")).toBe(false);
    });

    it("returns empty Set for empty input", async () => {
      const result = await getExistingGmailIds(googleAccountId, []);

      expect(result.size).toBe(0);
    });
  });

  describe("listDraftEmails()", () => {
    it("returns emails with draft status and is_processed=true", async () => {
      await seedEmail(googleAccountId, {
        id: TEST_IDS.email,
        verification_status: "draft",
        is_processed: true,
      });

      const result = await listDraftEmails(db);

      const ids = result.map((e) => e.id);
      expect(ids).toContain(TEST_IDS.email);
    });

    it("does not return unprocessed draft emails", async () => {
      await seedEmail(googleAccountId, {
        id: TEST_IDS.email,
        verification_status: "draft",
        is_processed: false,
      });

      const result = await listDraftEmails(db);

      const ids = result.map((e) => e.id);
      expect(ids).not.toContain(TEST_IDS.email);
    });
  });

  describe("getUnprocessedEmails()", () => {
    it("returns emails where is_processed=false", async () => {
      await seedEmail(googleAccountId, {
        id: TEST_IDS.email,
        is_processed: false,
      });

      const result = await getUnprocessedEmails(50);

      const ids = result.map((e) => e.id);
      expect(ids).toContain(TEST_IDS.email);
    });

    it("does not return processed emails", async () => {
      await seedEmail(googleAccountId, {
        id: TEST_IDS.email,
        is_processed: true,
      });

      const result = await getUnprocessedEmails(50);

      const ids = result.map((e) => e.id);
      expect(ids).not.toContain(TEST_IDS.email);
    });
  });
});
