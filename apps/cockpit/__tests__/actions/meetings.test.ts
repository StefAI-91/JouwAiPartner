import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mockAuthenticated,
  mockUnauthenticated,
  createIntegrationServerMock,
} from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks } from "../helpers/mock-next";
import { TEST_IDS } from "../../../../packages/database/__tests__/helpers/seed";
import { getTestClient } from "../../../../packages/database/__tests__/helpers/test-client";

vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createIntegrationServerMock());

const supabaseUrl =
  process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const describeWithDb = supabaseUrl ? describe : describe.skip;

describeWithDb("Meeting Server Actions (integration)", () => {
  const createdIds: string[] = [];

  beforeEach(async () => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
  });

  afterEach(async () => {
    const db = getTestClient();
    // Cleanup any created records
    for (const id of createdIds) {
      await db.from("organizations").delete().eq("id", id);
      await db.from("projects").delete().eq("id", id);
      await db.from("people").delete().eq("id", id);
    }
    createdIds.length = 0;
  });

  describe("createOrganizationAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/meetings");
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
      const mod = await import("../../src/actions/meetings");
      return mod.createProjectAction;
    }

    it("creates project with organization link", async () => {
      // First create an org to link to
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

        // Verify project exists and linked to org
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
      const mod = await import("../../src/actions/meetings");
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
