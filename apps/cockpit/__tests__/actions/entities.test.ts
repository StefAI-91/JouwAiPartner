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
      const mod = await import("../../src/actions/entities");
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
      const mod = await import("../../src/actions/entities");
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
      const mod = await import("../../src/actions/entities");
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
});
