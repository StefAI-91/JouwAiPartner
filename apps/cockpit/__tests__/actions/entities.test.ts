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
  seedMeeting,
  seedExtraction,
  TEST_IDS,
} from "../../../../packages/database/__tests__/helpers/seed";
import { cleanupTestData } from "../../../../packages/database/__tests__/helpers/cleanup";
import { getTestClient } from "../../../../packages/database/__tests__/helpers/test-client";

vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createIntegrationServerMock());

import { describeWithDb } from "../helpers/describe-with-db";

describeWithDb("Entity Server Actions (integration)")("Entity Server Actions (integration)", () => {
  beforeEach(async () => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    await seedOrganization();
    await seedProject();
    await seedPerson();
    await seedMeeting({ organization_id: TEST_IDS.organization });
    await seedExtraction();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe("updateOrganizationAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/organizations");
      return mod.updateOrganizationAction;
    }

    it("updates organization name", async () => {
      const updateOrganizationAction = await getAction();
      const result = await updateOrganizationAction({
        id: TEST_IDS.organization,
        name: "Updated Org Name",
      });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("organizations")
        .select("name")
        .eq("id", TEST_IDS.organization)
        .single();
      expect(data?.name).toBe("Updated Org Name");
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const updateOrganizationAction = await getAction();
      const result = await updateOrganizationAction({
        id: TEST_IDS.organization,
        name: "Should Fail",
      });
      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("deleteOrganizationAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/organizations");
      return mod.deleteOrganizationAction;
    }

    it("deletes organization", async () => {
      // Create a separate org to delete (don't mess with seed data FK deps)
      const extraOrgId = "00000000-0000-0000-0000-000000000010";
      const db = getTestClient();
      await db
        .from("organizations")
        .upsert({ id: extraOrgId, name: "To Delete Org", type: "other", status: "active" });

      const deleteOrganizationAction = await getAction();
      const result = await deleteOrganizationAction({ id: extraOrgId });
      expect(result).toEqual({ success: true });

      const { data } = await db.from("organizations").select("id").eq("id", extraOrgId).single();
      expect(data).toBeNull();
    });
  });

  describe("createExtractionAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/extractions");
      return mod.createExtractionAction;
    }

    it("creates extraction with confidence 1.0 and status verified", async () => {
      const createExtractionAction = await getAction();
      const result = await createExtractionAction({
        meeting_id: TEST_IDS.meeting,
        type: "decision",
        content: "Manual test extraction",
      });

      expect(result).toHaveProperty("success", true);

      if ("data" in result) {
        const db = getTestClient();
        const { data } = await db
          .from("extractions")
          .select("confidence, verification_status, content")
          .eq("id", result.data.id)
          .single();
        expect(data?.confidence).toBe(1.0);
        expect(data?.verification_status).toBe("verified");
        expect(data?.content).toBe("Manual test extraction");

        // Cleanup
        await db.from("extractions").delete().eq("id", result.data.id);
      }
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const createExtractionAction = await getAction();
      const result = await createExtractionAction({
        meeting_id: TEST_IDS.meeting,
        type: "decision",
        content: "Should fail",
      });
      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("create actions (fresh records)", () => {
    const createdIds: string[] = [];

    afterEach(async () => {
      const db = getTestClient();
      for (const id of createdIds) {
        await db.from("organizations").delete().eq("id", id);
        await db.from("projects").delete().eq("id", id);
        await db.from("people").delete().eq("id", id);
      }
      createdIds.length = 0;
    });

    describe("createOrganizationAction", () => {
      async function getAction() {
        const mod = await import("../../src/actions/organizations");
        return mod.createOrganizationAction;
      }

      it("creates organization and returns id and name", async () => {
        const createOrganizationAction = await getAction();
        const uniqueName = `Test Org ${Date.now()}`;
        const result = await createOrganizationAction({
          name: uniqueName,
          type: "partner",
        });

        expect(result).toHaveProperty("success", true);
        expect(result).toHaveProperty("data");
        if ("data" in result) {
          expect(result.data.name).toBe(uniqueName);
          expect(result.data.id).toBeTruthy();
          createdIds.push(result.data.id);
        }
      });

      it("returns error when not logged in", async () => {
        mockUnauthenticated();
        const createOrganizationAction = await getAction();
        const result = await createOrganizationAction({ name: "Should Fail" });
        expect(result).toEqual({ error: "Niet ingelogd" });
      });
    });

    describe("createProjectAction", () => {
      async function getAction() {
        const mod = await import("../../src/actions/projects");
        return mod.createProjectAction;
      }

      it("creates project with organization link", async () => {
        const db = getTestClient();
        const orgName = `Proj Org ${Date.now()}`;
        const { data: org } = await db
          .from("organizations")
          .insert({ name: orgName, type: "client", status: "active" })
          .select("id")
          .single();
        if (org) createdIds.push(org.id);

        const createProjectAction = await getAction();
        const result = await createProjectAction({
          name: `Test Project ${Date.now()}`,
          organizationId: org?.id ?? null,
        });

        expect(result).toHaveProperty("success", true);
        if ("data" in result) {
          createdIds.push(result.data.id);

          const { data: project } = await db
            .from("projects")
            .select("organization_id")
            .eq("id", result.data.id)
            .single();
          expect(project?.organization_id).toBe(org?.id);
        }
      });
    });

    describe("createPersonAction", () => {
      async function getAction() {
        const mod = await import("../../src/actions/people");
        return mod.createPersonAction;
      }

      it("creates person with all fields", async () => {
        const createPersonAction = await getAction();
        const uniqueEmail = `test-${Date.now()}@example.com`;
        const result = await createPersonAction({
          name: "Integration Test Person",
          email: uniqueEmail,
          role: "Tester",
        });

        expect(result).toHaveProperty("success", true);
        if ("data" in result) {
          createdIds.push(result.data.id);

          const db = getTestClient();
          const { data: person } = await db
            .from("people")
            .select("name, email, role")
            .eq("id", result.data.id)
            .single();
          expect(person?.name).toBe("Integration Test Person");
          expect(person?.email).toBe(uniqueEmail);
          expect(person?.role).toBe("Tester");
        }
      });

      it("returns error when not logged in", async () => {
        mockUnauthenticated();
        const createPersonAction = await getAction();
        const result = await createPersonAction({ name: "Should Fail" });
        expect(result).toEqual({ error: "Niet ingelogd" });
      });
    });
  });
});
