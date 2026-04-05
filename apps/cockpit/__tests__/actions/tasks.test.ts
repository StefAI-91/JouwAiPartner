import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mockAuthenticated,
  mockUnauthenticated,
  createIntegrationServerMock,
} from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks } from "../helpers/mock-next";
import {
  seedOrganization,
  seedMeeting,
  seedExtraction,
  seedTask,
  TEST_IDS,
} from "../../../../packages/database/__tests__/helpers/seed";
import { cleanupTestData } from "../../../../packages/database/__tests__/helpers/cleanup";
import { getTestClient } from "../../../../packages/database/__tests__/helpers/test-client";

// Mock Next.js cache and auth
vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createIntegrationServerMock());

import { describeWithDb } from "../helpers/describe-with-db";

describeWithDb("Task Server Actions (integration)")("Task Server Actions (integration)", () => {
  beforeEach(async () => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    // Seed required data: org -> meeting -> extraction
    await seedOrganization();
    await seedMeeting({ organization_id: TEST_IDS.organization });
    await seedExtraction();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe("promoteToTaskAction", () => {
    // Dynamic import to ensure mocks are applied
    async function getAction() {
      const mod = await import("../../src/actions/tasks");
      return mod.promoteToTaskAction;
    }

    it("creates a task with valid input", async () => {
      const promoteToTaskAction = await getAction();
      const result = await promoteToTaskAction({
        extractionId: TEST_IDS.extraction,
        title: "Integration test task",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id");

      // Verify in DB
      const db = getTestClient();
      const { data } = await db
        .from("tasks")
        .select("id, title, status, extraction_id")
        .eq("extraction_id", TEST_IDS.extraction)
        .single();
      expect(data?.title).toBe("Integration test task");
      expect(data?.status).toBe("active");

      // Cleanup the created task
      if (data?.id) {
        await db.from("tasks").delete().eq("id", data.id);
      }
    });

    it("returns error for invalid input", async () => {
      const promoteToTaskAction = await getAction();
      const result = await promoteToTaskAction({
        extractionId: "not-a-uuid",
        title: "Task",
      });

      expect(result).toHaveProperty("error");
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const promoteToTaskAction = await getAction();
      const result = await promoteToTaskAction({
        extractionId: TEST_IDS.extraction,
        title: "Task",
      });

      expect(result).toEqual({ error: "Niet ingelogd" });
    });

    it("rejects duplicate task for same extraction", async () => {
      const promoteToTaskAction = await getAction();
      // Create first task
      const first = await promoteToTaskAction({
        extractionId: TEST_IDS.extraction,
        title: "First task",
      });
      expect(first).toHaveProperty("success", true);

      // Try creating second task for same extraction
      const second = await promoteToTaskAction({
        extractionId: TEST_IDS.extraction,
        title: "Second task",
      });
      expect(second).toEqual({
        error: "Er bestaat al een taak voor dit actiepunt",
      });

      // Cleanup
      if ("id" in first) {
        await getTestClient().from("tasks").delete().eq("id", first.id);
      }
    });

    it("creates task with alreadyDone flag", async () => {
      const promoteToTaskAction = await getAction();
      const result = await promoteToTaskAction({
        extractionId: TEST_IDS.extraction,
        title: "Done task",
        alreadyDone: true,
      });

      expect(result).toHaveProperty("success", true);

      const db = getTestClient();
      const { data } = await db
        .from("tasks")
        .select("status, completed_at")
        .eq("extraction_id", TEST_IDS.extraction)
        .single();
      expect(data?.status).toBe("done");
      expect(data?.completed_at).toBeTruthy();

      // Cleanup
      if ("id" in result) {
        await db.from("tasks").delete().eq("id", result.id);
      }
    });
  });

  describe("completeTaskAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/tasks");
      return mod.completeTaskAction;
    }

    it("sets task status to done", async () => {
      await seedTask();
      const completeTaskAction = await getAction();
      const result = await completeTaskAction({ taskId: TEST_IDS.task });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("tasks")
        .select("status, completed_at")
        .eq("id", TEST_IDS.task)
        .single();
      expect(data?.status).toBe("done");
      expect(data?.completed_at).toBeTruthy();
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const completeTaskAction = await getAction();
      const result = await completeTaskAction({ taskId: TEST_IDS.task });
      expect(result).toEqual({ error: "Niet ingelogd" });
    });
  });

  describe("dismissTaskAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/tasks");
      return mod.dismissTaskAction;
    }

    it("sets task status to dismissed", async () => {
      await seedTask();
      const dismissTaskAction = await getAction();
      const result = await dismissTaskAction({ taskId: TEST_IDS.task });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db.from("tasks").select("status").eq("id", TEST_IDS.task).single();
      expect(data?.status).toBe("dismissed");
    });
  });
});
