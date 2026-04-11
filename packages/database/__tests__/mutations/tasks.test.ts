import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  seedOrganization,
  seedProject,
  seedMeeting,
  seedExtraction,
  TEST_IDS,
} from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import {
  createTaskFromExtraction,
  updateTask,
  completeTask,
  dismissTask,
} from "../../src/mutations/tasks";

let db: ReturnType<typeof getTestClient>;

describeWithDb("mutations/tasks", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    await seedMeeting({
      id: TEST_IDS.meeting,
      fireflies_id: "t02-tasks-main",
      organization_id: TEST_IDS.organization,
    });
    await seedExtraction({
      id: TEST_IDS.extraction,
      meeting_id: TEST_IDS.meeting,
    });
  });

  afterEach(async () => {
    await db.from("tasks").delete().eq("extraction_id", TEST_IDS.extraction);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("createTaskFromExtraction()", () => {
    it("inserts with status=active", async () => {
      const result = await createTaskFromExtraction(
        {
          extraction_id: TEST_IDS.extraction,
          title: "T02 Test Task",
          created_by: TEST_IDS.userId,
        },
        db,
      );

      expect(result).toHaveProperty("success", true);
      const id = (result as { success: true; id: string }).id;

      const { data: row } = await db
        .from("tasks")
        .select("status, title, extraction_id, completed_at")
        .eq("id", id)
        .single();

      expect(row?.status).toBe("active");
      expect(row?.title).toBe("T02 Test Task");
      expect(row?.extraction_id).toBe(TEST_IDS.extraction);
      expect(row?.completed_at).toBeNull();
    });

    it("with already_done=true sets status=done and completed_at", async () => {
      const result = await createTaskFromExtraction(
        {
          extraction_id: TEST_IDS.extraction,
          title: "Already Done Task",
          created_by: TEST_IDS.userId,
          already_done: true,
        },
        db,
      );

      expect(result).toHaveProperty("success", true);
      const id = (result as { success: true; id: string }).id;

      const { data: row } = await db
        .from("tasks")
        .select("status, completed_at")
        .eq("id", id)
        .single();

      expect(row?.status).toBe("done");
      expect(row?.completed_at).toBeDefined();
      expect(row?.completed_at).not.toBeNull();
    });
  });

  describe("updateTask()", () => {
    it("partial update (title, due_date) and sets updated_at", async () => {
      const { id } = (await createTaskFromExtraction(
        {
          extraction_id: TEST_IDS.extraction,
          title: "Original Title",
          created_by: TEST_IDS.userId,
        },
        db,
      )) as { success: true; id: string };

      // Get original updated_at
      const { data: before } = await db.from("tasks").select("updated_at").eq("id", id).single();

      // Small delay to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 50));

      const result = await updateTask(id, { title: "Updated Title", due_date: "2026-06-01" }, db);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("tasks")
        .select("title, due_date, updated_at")
        .eq("id", id)
        .single();

      expect(row?.title).toBe("Updated Title");
      expect(row?.due_date).toBe("2026-06-01");
      // updated_at should have changed
      expect(new Date(row!.updated_at).getTime()).toBeGreaterThan(
        new Date(before!.updated_at).getTime(),
      );
    });
  });

  describe("completeTask()", () => {
    it("sets status=done and completed_at=now", async () => {
      const { id } = (await createTaskFromExtraction(
        {
          extraction_id: TEST_IDS.extraction,
          title: "Task to Complete",
          created_by: TEST_IDS.userId,
        },
        db,
      )) as { success: true; id: string };

      const result = await completeTask(id, db);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("tasks")
        .select("status, completed_at")
        .eq("id", id)
        .single();

      expect(row?.status).toBe("done");
      expect(row?.completed_at).toBeDefined();
      expect(row?.completed_at).not.toBeNull();
    });
  });

  describe("dismissTask()", () => {
    it("sets status=dismissed", async () => {
      const { id } = (await createTaskFromExtraction(
        {
          extraction_id: TEST_IDS.extraction,
          title: "Task to Dismiss",
          created_by: TEST_IDS.userId,
        },
        db,
      )) as { success: true; id: string };

      const result = await dismissTask(id, db);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db.from("tasks").select("status").eq("id", id).single();

      expect(row?.status).toBe("dismissed");
    });
  });
});
