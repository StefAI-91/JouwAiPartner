import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mockAuthenticated,
  mockUnauthenticated,
  createIntegrationServerMock,
} from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks } from "../helpers/mock-next";
import {
  seedOrganization,
  seedProject,
  seedPerson,
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

let profileId: string;
let googleAccountId: string;

describeWithDb("Email Links Actions (integration)")("Email Links Actions (integration)", () => {
  beforeEach(async () => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    await seedOrganization();
    await seedProject();
    await seedPerson();
    const profile = await seedProfile({ full_name: "Email Links Tester" });
    profileId = profile.id;
    const account = await seedGoogleAccount(profileId);
    googleAccountId = account.id;
    await seedEmail(googleAccountId, {
      id: TEST_IDS.email,
      verification_status: "draft",
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

  describe("linkEmailProjectAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/email/links");
      return mod.linkEmailProjectAction;
    }

    it("links project to email", async () => {
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        projectId: TEST_IDS.project,
      });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("email_projects")
        .select("project_id, source")
        .eq("email_id", TEST_IDS.email)
        .eq("project_id", TEST_IDS.project)
        .single();
      expect(data).toBeDefined();
      expect(data?.source).toBe("manual");
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        projectId: TEST_IDS.project,
      });
      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("unlinkEmailProjectAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/email/links");
      return mod.unlinkEmailProjectAction;
    }

    it("removes project link from email", async () => {
      const db = getTestClient();
      // First link the project
      await db.from("email_projects").upsert({
        email_id: TEST_IDS.email,
        project_id: TEST_IDS.project,
        source: "manual",
      });

      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        projectId: TEST_IDS.project,
      });

      expect(result).toEqual({ success: true });

      const { count } = await db
        .from("email_projects")
        .select("*", { count: "exact", head: true })
        .eq("email_id", TEST_IDS.email)
        .eq("project_id", TEST_IDS.project);
      expect(count).toBe(0);
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        projectId: TEST_IDS.project,
      });
      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("updateEmailOrganizationAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/email/links");
      return mod.updateEmailOrganizationAction;
    }

    it("updates organization_id on email", async () => {
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        organizationId: TEST_IDS.organization,
      });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("emails")
        .select("organization_id")
        .eq("id", TEST_IDS.email)
        .single();
      expect(data?.organization_id).toBe(TEST_IDS.organization);
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        organizationId: TEST_IDS.organization,
      });
      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("updateEmailSenderPersonAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/email/links");
      return mod.updateEmailSenderPersonAction;
    }

    it("updates sender_person_id on email", async () => {
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        senderPersonId: TEST_IDS.person,
      });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("emails")
        .select("sender_person_id")
        .eq("id", TEST_IDS.email)
        .single();
      expect(data?.sender_person_id).toBe(TEST_IDS.person);
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        senderPersonId: TEST_IDS.person,
      });
      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("updateEmailTypeAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/email/links");
      return mod.updateEmailTypeAction;
    }

    it("updates email_type on email", async () => {
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        emailType: "project_communication",
      });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("emails")
        .select("email_type")
        .eq("id", TEST_IDS.email)
        .single();
      expect(data?.email_type).toBe("project_communication");
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        emailType: "sales",
      });
      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("updateEmailPartyTypeAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/email/links");
      return mod.updateEmailPartyTypeAction;
    }

    it("updates party_type on email", async () => {
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        partyType: "client",
      });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("emails")
        .select("party_type")
        .eq("id", TEST_IDS.email)
        .single();
      expect(data?.party_type).toBe("client");
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const action = await getAction();
      const result = await action({
        emailId: TEST_IDS.email,
        partyType: "internal",
      });
      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });
});
