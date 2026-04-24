import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mockAuthenticated,
  mockUnauthenticated,
  createIntegrationServerMock,
} from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks, getRevalidatePathCalls } from "../helpers/mock-next";
import {
  seedOrganization,
  seedProject,
  seedProfile,
  seedGoogleAccount,
  seedEmail,
  TEST_IDS,
} from "../../../../packages/database/__tests__/helpers/seed";
import {
  cleanupTestData,
  cleanupTestProfile,
} from "../../../../packages/database/__tests__/helpers/cleanup";
import { getTestClient } from "../../../../packages/database/__tests__/helpers/test-client";
import { describeWithDb } from "../helpers/describe-with-db";

vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createIntegrationServerMock());
vi.mock("@repo/ai/pipeline/summary-pipeline", () => ({
  triggerSummariesForEmail: vi.fn(async () => {}),
}));

let profileId: string;
let googleAccountId: string;

describeWithDb("Email Review Actions (integration)")("Email Review Actions (integration)", () => {
  beforeEach(async () => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    await seedOrganization();
    await seedProject();
    const profile = await seedProfile({ full_name: "Email Review Tester" });
    profileId = profile.id;
    const account = await seedGoogleAccount(profileId);
    googleAccountId = account.id;
    await seedEmail(googleAccountId, {
      id: TEST_IDS.email,
      verification_status: "draft",
      is_processed: true,
    });
  });

  afterEach(async () => {
    const db = getTestClient();
    await db.from("email_extractions").delete().eq("email_id", TEST_IDS.email);
    await db.from("email_projects").delete().eq("email_id", TEST_IDS.email);
    await db.from("emails").delete().eq("id", TEST_IDS.email);
    await db.from("emails").delete().eq("google_account_id", googleAccountId);
    await db.from("google_accounts").delete().eq("id", googleAccountId);
    await cleanupTestProfile(profileId);
    await cleanupTestData();
  });

  describe("approveEmailAction", () => {
    async function getAction() {
      const mod = await import("../../src/features/emails/actions/review");
      return mod.approveEmailAction;
    }

    it("sets email verification_status to verified", async () => {
      const action = await getAction();
      const result = await action({ emailId: TEST_IDS.email });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("emails")
        .select("verification_status")
        .eq("id", TEST_IDS.email)
        .single();
      expect(data?.verification_status).toBe("verified");
    });

    it("revalidates correct paths", async () => {
      const action = await getAction();
      await action({ emailId: TEST_IDS.email });

      const paths = getRevalidatePathCalls();
      expect(paths).toContain("/review");
      expect(paths).toContain("/emails");
      expect(paths).toContain("/");
    });

    it("returns Unauthorized when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({ emailId: TEST_IDS.email });

      expect(result).toEqual({ error: "Unauthorized" });
    });

    it("returns error on invalid input", async () => {
      const action = await getAction();
      const result = await action({ emailId: "not-a-uuid" } as never);

      expect(result).toHaveProperty("error");
    });
  });

  describe("approveEmailWithEditsAction", () => {
    async function getAction() {
      const mod = await import("../../src/features/emails/actions/review");
      return mod.approveEmailWithEditsAction;
    }

    it("approves email with edits", async () => {
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        extractionEdits: [],
        rejectedExtractionIds: [],
        typeChanges: [],
      });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("emails")
        .select("verification_status")
        .eq("id", TEST_IDS.email)
        .single();
      expect(data?.verification_status).toBe("verified");
    });

    it("returns Unauthorized when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({ emailId: TEST_IDS.email });

      expect(result).toEqual({ error: "Unauthorized" });
    });
  });

  describe("rejectEmailAction", () => {
    async function getAction() {
      const mod = await import("../../src/features/emails/actions/review");
      return mod.rejectEmailAction;
    }

    it("rejects email with reason", async () => {
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        reason: "Not relevant",
      });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("emails")
        .select("verification_status")
        .eq("id", TEST_IDS.email)
        .single();
      expect(data?.verification_status).toBe("rejected");
    });

    it("returns error with empty reason", async () => {
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        reason: "",
      });

      expect(result).toHaveProperty("error");
    });

    it("returns Unauthorized when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        reason: "test",
      });

      expect(result).toEqual({ error: "Unauthorized" });
    });
  });
});
