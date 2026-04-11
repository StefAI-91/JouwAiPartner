import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  seedOrganization,
  seedProject,
  seedProfile,
  seedGoogleAccount,
  seedEmail,
  TEST_IDS,
} from "../helpers/seed";
import { cleanupTestData, cleanupTestProfile } from "../helpers/cleanup";
import {
  upsertGoogleAccount,
  insertEmails,
  updateEmailClassification,
  verifyEmail,
  rejectEmail,
  linkEmailProject,
  unlinkEmailProject,
  insertEmailExtractions,
} from "../../src/mutations/emails";

let db: ReturnType<typeof getTestClient>;

describeWithDb("mutations/emails", () => {
  let profileId: string;
  let googleAccountId: string;

  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();

    // Create auth user + profile for google_accounts FK
    const profile = await seedProfile({ email: "t02-email-test@test.local" });
    profileId = profile.id;

    // Create google account for email tests
    const ga = await seedGoogleAccount(profileId, {
      email: "t02-google@test.local",
    });
    googleAccountId = ga.id;
  });

  afterEach(async () => {
    await db.from("email_extractions").delete().eq("email_id", TEST_IDS.email);
    await db.from("email_projects").delete().eq("email_id", TEST_IDS.email);
    await db.from("emails").delete().eq("id", TEST_IDS.email);
    // Clean up any emails created by insertEmails tests
    await db.from("emails").delete().eq("google_account_id", googleAccountId);
  });

  afterAll(async () => {
    await db.from("google_accounts").delete().eq("id", googleAccountId);
    await cleanupTestData();
    await cleanupTestProfile(profileId);
  });

  describe("upsertGoogleAccount()", () => {
    it("inserts a new account and returns id", async () => {
      const result = await upsertGoogleAccount({
        user_id: profileId,
        email: "t02-upsert-new@test.local",
        access_token: "token-new",
        refresh_token: "refresh-new",
        token_expiry: new Date(Date.now() + 3600_000).toISOString(),
        scopes: ["gmail.readonly"],
      });

      expect(result).toHaveProperty("success", true);
      const id = (result as { success: true; data: { id: string } }).data.id;
      expect(id).toBeDefined();

      // Cleanup
      await db.from("google_accounts").delete().eq("id", id);
    });

    it("updates existing account on email conflict", async () => {
      // Insert first
      const first = await upsertGoogleAccount({
        user_id: profileId,
        email: "t02-upsert-dup@test.local",
        access_token: "token-v1",
        refresh_token: "refresh-v1",
        token_expiry: new Date(Date.now() + 3600_000).toISOString(),
        scopes: [],
      });
      const firstId = (first as { success: true; data: { id: string } }).data.id;

      // Upsert with same email
      const second = await upsertGoogleAccount({
        user_id: profileId,
        email: "t02-upsert-dup@test.local",
        access_token: "token-v2",
        refresh_token: "refresh-v2",
        token_expiry: new Date(Date.now() + 7200_000).toISOString(),
        scopes: ["gmail.send"],
      });

      expect(second).toHaveProperty("success", true);
      const secondId = (second as { success: true; data: { id: string } }).data.id;

      // Should be the same record
      expect(secondId).toBe(firstId);

      // Verify updated values
      const { data: row } = await db
        .from("google_accounts")
        .select("access_token")
        .eq("id", firstId)
        .single();

      expect(row?.access_token).toBe("token-v2");

      // Cleanup
      await db.from("google_accounts").delete().eq("id", firstId);
    });
  });

  describe("insertEmails()", () => {
    it("batch upserts and returns count + id array", async () => {
      const result = await insertEmails([
        {
          google_account_id: googleAccountId,
          gmail_id: "t02-email-batch-1",
          thread_id: "thread-1",
          subject: "Test Email 1",
          from_address: "alice@test.local",
          from_name: "Alice",
          to_addresses: ["bob@test.local"],
          cc_addresses: [],
          date: "2026-01-15T10:00:00Z",
          body_text: "Body 1",
          body_html: null,
          snippet: "Snippet 1",
          labels: ["INBOX"],
          has_attachments: false,
          raw_gmail: {},
          embedding_stale: true,
          verification_status: "draft",
        },
        {
          google_account_id: googleAccountId,
          gmail_id: "t02-email-batch-2",
          thread_id: "thread-2",
          subject: "Test Email 2",
          from_address: "charlie@test.local",
          from_name: "Charlie",
          to_addresses: ["bob@test.local"],
          cc_addresses: [],
          date: "2026-01-15T11:00:00Z",
          body_text: "Body 2",
          body_html: null,
          snippet: "Snippet 2",
          labels: ["INBOX"],
          has_attachments: false,
          raw_gmail: {},
          embedding_stale: true,
          verification_status: "draft",
        },
      ]);

      expect(result).toHaveProperty("success", true);
      const r = result as { success: true; count: number; ids: string[] };
      expect(r.count).toBe(2);
      expect(r.ids).toHaveLength(2);
    });

    it("returns count=0 for empty batch", async () => {
      const result = await insertEmails([]);

      expect(result).toEqual({ success: true, count: 0, ids: [] });
    });

    it("ignores duplicate gmail_id+account_id", async () => {
      const emailRow = {
        google_account_id: googleAccountId,
        gmail_id: "t02-email-dup-check",
        thread_id: "thread-dup",
        subject: "Original",
        from_address: "sender@test.local",
        from_name: null,
        to_addresses: [],
        cc_addresses: [],
        date: "2026-01-20T10:00:00Z",
        body_text: "Original body",
        body_html: null,
        snippet: null,
        labels: [],
        has_attachments: false,
        raw_gmail: {},
        embedding_stale: true,
        verification_status: "draft" as const,
      };

      // First insert
      await insertEmails([emailRow]);

      // Second insert with same gmail_id — should be ignored
      const result = await insertEmails([{ ...emailRow, subject: "Updated" }]);

      expect(result).toHaveProperty("success", true);
      // ignoreDuplicates means it returns 0 for the dup
      const r = result as { success: true; count: number; ids: string[] };
      expect(r.count).toBe(0);
    });
  });

  describe("updateEmailClassification()", () => {
    it("writes classification fields", async () => {
      const email = await seedEmail(googleAccountId);

      const result = await updateEmailClassification(email.id, {
        organization_id: TEST_IDS.organization,
        unmatched_organization_name: null,
        relevance_score: 0.85,
        is_processed: true,
        email_type: "inquiry",
        party_type: "client",
      });

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("emails")
        .select("organization_id, relevance_score, is_processed, email_type, party_type")
        .eq("id", email.id)
        .single();

      expect(row?.organization_id).toBe(TEST_IDS.organization);
      expect(row?.relevance_score).toBe(0.85);
      expect(row?.is_processed).toBe(true);
      expect(row?.email_type).toBe("inquiry");
      expect(row?.party_type).toBe("client");
    });
  });

  describe("verifyEmail()", () => {
    it("sets verification_status to verified via RPC", async () => {
      const email = await seedEmail(googleAccountId);

      const result = await verifyEmail(email.id, profileId);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("emails")
        .select("verification_status, verified_by, verified_at")
        .eq("id", email.id)
        .single();

      expect(row?.verification_status).toBe("verified");
      expect(row?.verified_at).toBeDefined();
    });
  });

  describe("rejectEmail()", () => {
    it("sets verification_status to rejected via RPC", async () => {
      const email = await seedEmail(googleAccountId);

      const result = await rejectEmail(email.id, profileId, "Not relevant");

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("emails")
        .select("verification_status")
        .eq("id", email.id)
        .single();

      expect(row?.verification_status).toBe("rejected");
    });
  });

  describe("linkEmailProject()", () => {
    it("upserts with default source=ai", async () => {
      const email = await seedEmail(googleAccountId);

      const result = await linkEmailProject(email.id, TEST_IDS.project);

      expect(result).toHaveProperty("success", true);

      const { data: link } = await db
        .from("email_projects")
        .select("source")
        .eq("email_id", email.id)
        .eq("project_id", TEST_IDS.project)
        .single();

      expect(link?.source).toBe("ai");
    });
  });

  describe("unlinkEmailProject()", () => {
    it("removes specific link", async () => {
      const email = await seedEmail(googleAccountId);
      await linkEmailProject(email.id, TEST_IDS.project);

      const result = await unlinkEmailProject(email.id, TEST_IDS.project);

      expect(result).toHaveProperty("success", true);

      const { count } = await db
        .from("email_projects")
        .select("*", { count: "exact", head: true })
        .eq("email_id", email.id)
        .eq("project_id", TEST_IDS.project);

      expect(count).toBe(0);
    });
  });

  describe("insertEmailExtractions()", () => {
    it("batch inserts into email_extractions", async () => {
      const email = await seedEmail(googleAccountId);

      const result = await insertEmailExtractions([
        {
          email_id: email.id,
          type: "decision",
          content: "Email decision extracted",
          confidence: 0.9,
          source_ref: "paragraph 2",
          metadata: {},
          project_id: null,
          embedding_stale: true,
          verification_status: "draft",
        },
        {
          email_id: email.id,
          type: "insight",
          content: "Email insight extracted",
          confidence: 0.75,
          source_ref: null,
          metadata: { category: "tech" },
          project_id: TEST_IDS.project,
          embedding_stale: true,
          verification_status: "draft",
        },
      ]);

      expect(result).toHaveProperty("success", true);
      expect((result as { success: true; count: number }).count).toBe(2);

      // Verify in DB
      const { count } = await db
        .from("email_extractions")
        .select("*", { count: "exact", head: true })
        .eq("email_id", email.id);

      expect(count).toBe(2);
    });

    it("returns count=0 for empty array", async () => {
      const result = await insertEmailExtractions([]);

      expect(result).toEqual({ success: true, count: 0 });
    });
  });
});
