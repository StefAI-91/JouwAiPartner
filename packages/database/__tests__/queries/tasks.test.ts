import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  seedOrganization,
  seedProject,
  seedMeeting,
  seedExtraction,
  seedTask,
  seedPerson,
  TEST_IDS,
} from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import {
  listActiveTasks,
  hasTaskForExtraction,
  getPromotedExtractionIds,
  listAllTasks,
} from "../../src/queries/tasks";

let db: ReturnType<typeof getTestClient>;

describeWithDb("queries/tasks", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    await seedPerson();
    await seedMeeting({ id: TEST_IDS.meeting, verification_status: "verified" });
    await seedExtraction({ id: TEST_IDS.extraction, meeting_id: TEST_IDS.meeting });
    await seedExtraction({
      id: TEST_IDS.extraction2,
      meeting_id: TEST_IDS.meeting,
      content: "Second extraction",
    });
  });

  afterEach(async () => {
    await db.from("tasks").delete().eq("id", TEST_IDS.task);
    await db.from("tasks").delete().eq("id", TEST_IDS.task2);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("listActiveTasks()", () => {
    it("returns only active tasks ordered by due_date ASC nulls last", async () => {
      await seedTask({
        id: TEST_IDS.task,
        title: "Task with date",
        status: "active",
        due_date: "2026-02-01",
      });
      await seedTask({
        id: TEST_IDS.task2,
        title: "Task no date",
        status: "active",
        extraction_id: TEST_IDS.extraction2,
        due_date: null,
      });

      const result = await listActiveTasks(20, db);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const testTasks = result.filter((t) => t.id === TEST_IDS.task || t.id === TEST_IDS.task2);
      expect(testTasks).toHaveLength(2);

      // Task with due_date should come before task without
      const idxWithDate = result.findIndex((t) => t.id === TEST_IDS.task);
      const idxNoDate = result.findIndex((t) => t.id === TEST_IDS.task2);
      expect(idxWithDate).toBeLessThan(idxNoDate);
    });

    it("does not return done or dismissed tasks", async () => {
      await seedTask({ id: TEST_IDS.task, status: "done" });
      await seedTask({
        id: TEST_IDS.task2,
        status: "dismissed",
        extraction_id: TEST_IDS.extraction2,
      });

      const result = await listActiveTasks(50, db);
      const testIds = result.map((t) => t.id);

      expect(testIds).not.toContain(TEST_IDS.task);
      expect(testIds).not.toContain(TEST_IDS.task2);
    });
  });

  describe("hasTaskForExtraction()", () => {
    it("returns true when an active task exists for extraction", async () => {
      await seedTask({
        id: TEST_IDS.task,
        extraction_id: TEST_IDS.extraction,
        status: "active",
      });

      const result = await hasTaskForExtraction(TEST_IDS.extraction, db);

      expect(result).toBe(true);
    });

    it("returns true when a done task exists for extraction", async () => {
      await seedTask({
        id: TEST_IDS.task,
        extraction_id: TEST_IDS.extraction,
        status: "done",
      });

      const result = await hasTaskForExtraction(TEST_IDS.extraction, db);

      expect(result).toBe(true);
    });

    it("returns false when only a dismissed task exists", async () => {
      await seedTask({
        id: TEST_IDS.task,
        extraction_id: TEST_IDS.extraction,
        status: "dismissed",
      });

      const result = await hasTaskForExtraction(TEST_IDS.extraction, db);

      expect(result).toBe(false);
    });

    it("returns false when no task exists", async () => {
      const result = await hasTaskForExtraction(TEST_IDS.extraction, db);

      expect(result).toBe(false);
    });
  });

  describe("getPromotedExtractionIds()", () => {
    it("returns Set of extraction_ids with non-dismissed tasks", async () => {
      await seedTask({
        id: TEST_IDS.task,
        extraction_id: TEST_IDS.extraction,
        status: "active",
      });
      await seedTask({
        id: TEST_IDS.task2,
        extraction_id: TEST_IDS.extraction2,
        status: "dismissed",
      });

      const result = await getPromotedExtractionIds(
        [TEST_IDS.extraction, TEST_IDS.extraction2],
        db,
      );

      expect(result).toBeInstanceOf(Set);
      expect(result.has(TEST_IDS.extraction)).toBe(true);
      expect(result.has(TEST_IDS.extraction2)).toBe(false);
    });

    it("returns empty Set for empty input", async () => {
      const result = await getPromotedExtractionIds([], db);

      expect(result.size).toBe(0);
    });
  });

  describe("listAllTasks()", () => {
    it("returns active and done tasks, not dismissed; active first", async () => {
      await seedTask({
        id: TEST_IDS.task,
        status: "active",
        title: "Active Task",
      });
      await seedTask({
        id: TEST_IDS.task2,
        status: "done",
        title: "Done Task",
        extraction_id: TEST_IDS.extraction2,
      });

      const result = await listAllTasks(50, db);
      const testTasks = result.filter((t) => t.id === TEST_IDS.task || t.id === TEST_IDS.task2);

      expect(testTasks).toHaveLength(2);
      expect(testTasks.some((t) => t.status === "dismissed")).toBe(false);

      // Active should come before done
      const activeIdx = result.findIndex((t) => t.id === TEST_IDS.task);
      const doneIdx = result.findIndex((t) => t.id === TEST_IDS.task2);
      expect(activeIdx).toBeLessThan(doneIdx);
    });

    it("excludes dismissed tasks", async () => {
      await seedTask({
        id: TEST_IDS.task,
        status: "dismissed",
      });

      const result = await listAllTasks(50, db);
      const ids = result.map((t) => t.id);

      expect(ids).not.toContain(TEST_IDS.task);
    });
  });
});
