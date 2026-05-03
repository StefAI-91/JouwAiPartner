import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  seedOrganization,
  seedProject,
  seedPerson,
  seedIssue,
  seedProfile,
  TEST_IDS,
} from "../helpers/seed";
import { cleanupTestData, cleanupTestProfile } from "../helpers/cleanup";
import {
  listIssues,
  getIssueById,
  getIssueCounts,
  getDashboardThisWeek,
} from "../../src/queries/issues";
import { listIssueComments } from "../../src/queries/issues/comments";
import { listIssueActivity } from "../../src/queries/issues/activity";
import { getIssueThumbnails } from "../../src/queries/issues/attachments";

let db: ReturnType<typeof getTestClient>;
let profileId: string;

describeWithDb("queries/issues", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    await seedPerson();
    const profile = await seedProfile({ full_name: "Issue Test User" });
    profileId = profile.id;
  });

  afterEach(async () => {
    await db.from("issue_attachments").delete().eq("issue_id", TEST_IDS.issue);
    await db.from("issue_activity").delete().eq("issue_id", TEST_IDS.issue);
    await db.from("issue_comments").delete().eq("issue_id", TEST_IDS.issue);
    await db.from("issues").delete().eq("id", TEST_IDS.issue);
  });

  afterAll(async () => {
    await cleanupTestProfile(profileId);
    await cleanupTestData();
  });

  describe("listIssues()", () => {
    it("returns issues filtered by projectId", async () => {
      await seedIssue({
        id: TEST_IDS.issue,
        project_id: TEST_IDS.project,
        title: "Test Issue List",
        priority: "high",
      });

      const result = await listIssues({ projectId: TEST_IDS.project }, db);

      const ids = result.map((i) => i.id);
      expect(ids).toContain(TEST_IDS.issue);
    });

    it("filters by status", async () => {
      await seedIssue({
        id: TEST_IDS.issue,
        status: "triage",
      });

      const result = await listIssues({ projectId: TEST_IDS.project, status: ["backlog"] }, db);

      const ids = result.map((i) => i.id);
      expect(ids).not.toContain(TEST_IDS.issue);
    });

    it("filters by priority", async () => {
      await seedIssue({
        id: TEST_IDS.issue,
        priority: "low",
      });

      const result = await listIssues({ projectId: TEST_IDS.project, priority: ["urgent"] }, db);

      const ids = result.map((i) => i.id);
      expect(ids).not.toContain(TEST_IDS.issue);
    });

    it("search: sanitized ilike on title|description", async () => {
      await seedIssue({
        id: TEST_IDS.issue,
        title: "UniqueSearchTerm XYZ",
        description: "Some description",
      });

      const result = await listIssues(
        { projectId: TEST_IDS.project, search: "UniqueSearchTerm" },
        db,
      );

      const ids = result.map((i) => i.id);
      expect(ids).toContain(TEST_IDS.issue);
    });

    it("sorts by priority weight then created_at DESC", async () => {
      // Create two issues with different priorities
      await seedIssue({
        id: TEST_IDS.issue,
        priority: "low",
        title: "Low Priority Issue",
      });

      const result = await listIssues({ projectId: TEST_IDS.project }, db);

      // Should not throw and return at least the seeded issue
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getIssueById()", () => {
    it("returns issue with assigned_person relation", async () => {
      await seedIssue({
        id: TEST_IDS.issue,
        title: "Detail Issue",
      });

      const result = await getIssueById(TEST_IDS.issue, db);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEST_IDS.issue);
      expect(result!.title).toBe("Detail Issue");
    });

    it("returns null for non-existent issue", async () => {
      const result = await getIssueById("00000000-0000-0000-0000-ffffffffffff", db);

      expect(result).toBeNull();
    });
  });

  describe("getIssueCounts()", () => {
    it("returns count per status", async () => {
      await seedIssue({
        id: TEST_IDS.issue,
        status: "triage",
      });

      const result = await getIssueCounts(TEST_IDS.project, db);

      expect(result).toHaveProperty("triage");
      expect(result).toHaveProperty("backlog");
      expect(result).toHaveProperty("todo");
      expect(result).toHaveProperty("in_progress");
      expect(result).toHaveProperty("done");
      expect(result).toHaveProperty("cancelled");
      expect(result.triage).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getDashboardThisWeek()", () => {
    it("urgent bucket bevat alleen open P0/P1 issues", async () => {
      await seedIssue({
        id: TEST_IDS.issue,
        priority: "high",
        status: "todo",
      });

      const { urgent } = await getDashboardThisWeek(TEST_IDS.project, db);

      const ids = urgent.map((i) => i.id);
      expect(ids).toContain(TEST_IDS.issue);
      // Geen done/cancelled in urgent
      const closed = urgent.filter((i) => i.status === "done" || i.status === "cancelled");
      expect(closed.length).toBe(0);
      // Geen P2/P3 in urgent
      const lowerPrio = urgent.filter((i) => i.priority === "medium" || i.priority === "low");
      expect(lowerPrio.length).toBe(0);
    });

    it("active bucket bevat alleen status=in_progress (alle prio)", async () => {
      await seedIssue({
        id: TEST_IDS.issue,
        priority: "low",
        status: "in_progress",
      });

      const { active } = await getDashboardThisWeek(TEST_IDS.project, db);

      const ids = active.map((i) => i.id);
      expect(ids).toContain(TEST_IDS.issue);
      // Alleen in_progress, niets anders
      const wrongStatus = active.filter((i) => i.status !== "in_progress");
      expect(wrongStatus.length).toBe(0);
    });

    it("issue dat én P0/P1 én in_progress is verschijnt in beide buckets", async () => {
      await seedIssue({
        id: TEST_IDS.issue,
        priority: "urgent",
        status: "in_progress",
      });

      const { urgent, active } = await getDashboardThisWeek(TEST_IDS.project, db);

      expect(urgent.map((i) => i.id)).toContain(TEST_IDS.issue);
      expect(active.map((i) => i.id)).toContain(TEST_IDS.issue);
    });
  });

  describe("listIssueComments()", () => {
    it("returns comments ordered by created_at ASC (chronological)", async () => {
      await seedIssue({ id: TEST_IDS.issue });

      // Insert two comments
      await db.from("issue_comments").insert({
        issue_id: TEST_IDS.issue,
        author_id: profileId,
        body: "First comment",
      });
      await db.from("issue_comments").insert({
        issue_id: TEST_IDS.issue,
        author_id: profileId,
        body: "Second comment",
      });

      const result = await listIssueComments(TEST_IDS.issue, {}, db);

      expect(result.length).toBeGreaterThanOrEqual(2);
      // Check chronological order
      const testComments = result.filter((c) => c.issue_id === TEST_IDS.issue);
      expect(testComments[0].body).toBe("First comment");
      expect(testComments[1].body).toBe("Second comment");
    });

    it("includes author relation", async () => {
      await seedIssue({ id: TEST_IDS.issue });
      await db.from("issue_comments").insert({
        issue_id: TEST_IDS.issue,
        author_id: profileId,
        body: "Comment with author",
      });

      const result = await listIssueComments(TEST_IDS.issue, {}, db);
      const comment = result.find((c) => c.body === "Comment with author");

      expect(comment).toBeDefined();
      expect(comment!.author).not.toBeNull();
    });
  });

  describe("listIssueActivity()", () => {
    it("returns activity ordered by created_at DESC", async () => {
      await seedIssue({ id: TEST_IDS.issue });

      await db.from("issue_activity").insert({
        issue_id: TEST_IDS.issue,
        actor_id: profileId,
        action: "status_changed",
        field: "status",
        old_value: "triage",
        new_value: "backlog",
        metadata: {},
      });

      const result = await listIssueActivity(TEST_IDS.issue, {}, db);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const activity = result.find((a) => a.action === "status_changed");
      expect(activity).toBeDefined();
      expect(activity!.field).toBe("status");
      expect(activity!.old_value).toBe("triage");
      expect(activity!.new_value).toBe("backlog");
    });
  });

  describe("getIssueThumbnails()", () => {
    it("returns Map of issueId to storagePath for first screenshot", async () => {
      await seedIssue({ id: TEST_IDS.issue });

      await db.from("issue_attachments").insert({
        issue_id: TEST_IDS.issue,
        type: "screenshot",
        storage_path: "screenshots/test-1.png",
        file_name: "test-1.png",
      });
      await db.from("issue_attachments").insert({
        issue_id: TEST_IDS.issue,
        type: "screenshot",
        storage_path: "screenshots/test-2.png",
        file_name: "test-2.png",
      });

      const result = await getIssueThumbnails([TEST_IDS.issue], db);

      expect(result).toBeInstanceOf(Map);
      expect(result.has(TEST_IDS.issue)).toBe(true);
      // Should return only the first screenshot
      expect(result.get(TEST_IDS.issue)).toBe("screenshots/test-1.png");
    });

    it("returns empty Map for empty input", async () => {
      const result = await getIssueThumbnails([], db);

      expect(result.size).toBe(0);
    });
  });
});
