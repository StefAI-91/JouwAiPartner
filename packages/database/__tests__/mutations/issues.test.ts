import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import { seedOrganization, seedProject, seedProfile, seedIssue, TEST_IDS } from "../helpers/seed";
import { cleanupTestData, cleanupTestProfile } from "../helpers/cleanup";
import {
  insertIssue,
  updateIssue,
  upsertUserbackIssues,
  deleteIssue,
  insertComment,
  updateComment,
  deleteComment,
  insertActivity,
} from "../../src/mutations/issues";

let db: ReturnType<typeof getTestClient>;

describeWithDb("mutations/issues", () => {
  let profileId: string;

  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();

    // Create auth user + profile for issue_comments FK
    const profile = await seedProfile({ email: "t02-issues-test@test.local" });
    profileId = profile.id;
  });

  afterEach(async () => {
    // Clean up issues created during tests
    await db.from("issue_activity").delete().eq("issue_id", TEST_IDS.issue);
    await db.from("issue_comments").delete().eq("issue_id", TEST_IDS.issue);
    await db.from("issues").delete().eq("id", TEST_IDS.issue);
    await db.from("issues").delete().eq("project_id", TEST_IDS.project);
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestProfile(profileId);
  });

  describe("insertIssue()", () => {
    it("calls next_issue_number() and returns issue with number", async () => {
      const issue = await insertIssue(
        {
          project_id: TEST_IDS.project,
          title: "T02 Test Issue",
          description: "Test description",
          type: "bug",
          priority: "high",
        },
        db,
      );

      expect(issue.id).toBeDefined();
      expect(issue.title).toBe("T02 Test Issue");
      expect(issue.issue_number).toBeGreaterThan(0);
      expect(typeof issue.issue_number).toBe("number");
    });

    it("assigns sequential issue numbers", async () => {
      const issue1 = await insertIssue({ project_id: TEST_IDS.project, title: "Sequential 1" }, db);
      const issue2 = await insertIssue({ project_id: TEST_IDS.project, title: "Sequential 2" }, db);

      expect(issue2.issue_number).toBe(issue1.issue_number + 1);
    });
  });

  describe("updateIssue()", () => {
    it("partial update + updated_at timestamp", async () => {
      const issue = await insertIssue(
        {
          project_id: TEST_IDS.project,
          title: "Before Update",
          priority: "low",
        },
        db,
      );

      const updated = await updateIssue(
        issue.id,
        { title: "After Update", priority: "critical" },
        db,
      );

      expect(updated.title).toBe("After Update");
      expect(updated.priority).toBe("critical");
      expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(issue.updated_at).getTime(),
      );
    });
  });

  describe("upsertUserbackIssues()", () => {
    it("inserts new record when userback_id not in existingMap", async () => {
      const items = [
        {
          project_id: TEST_IDS.project,
          title: "Userback New Issue",
          description: "From userback",
          source: "userback",
          userback_id: "ub-t02-new-1",
          type: "bug",
          priority: "medium",
          status: "triage",
        },
      ];

      const result = await upsertUserbackIssues(items, new Map(), db);

      expect(result.imported).toHaveLength(1);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify it has an issue_number
      const { data: row } = await db
        .from("issues")
        .select("issue_number, title")
        .eq("id", result.imported[0])
        .single();

      expect(row?.issue_number).toBeGreaterThan(0);
      expect(row?.title).toBe("Userback New Issue");
    });

    it("updates existing record when userback_id is in existingMap", async () => {
      // Insert an issue first
      const issue = await insertIssue(
        {
          project_id: TEST_IDS.project,
          title: "Existing Userback",
          userback_id: "ub-t02-existing",
          source: "userback",
        },
        db,
      );

      const existingMap = new Map([["ub-t02-existing", issue.id]]);

      const result = await upsertUserbackIssues(
        [
          {
            project_id: TEST_IDS.project,
            title: "Updated Userback Title",
            userback_id: "ub-t02-existing",
            source: "userback",
            status: "open",
          },
        ],
        existingMap,
        db,
      );

      expect(result.imported).toHaveLength(0);
      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify title was updated
      const { data: row } = await db.from("issues").select("title").eq("id", issue.id).single();

      expect(row?.title).toBe("Updated Userback Title");
    });

    it("returns stats: { imported, updated, skipped, errors }", async () => {
      const result = await upsertUserbackIssues([], new Map(), db);

      expect(result).toEqual({
        imported: [],
        importedMap: expect.any(Map),
        updated: 0,
        skipped: 0,
        errors: [],
      });
    });
  });

  describe("deleteIssue()", () => {
    it("cascade deletes comments and activity", async () => {
      const issue = await insertIssue(
        { project_id: TEST_IDS.project, title: "Delete Cascade Test" },
        db,
      );

      // Add a comment and activity
      await db.from("issue_comments").insert({
        issue_id: issue.id,
        author_id: profileId,
        body: "Test comment",
      });
      await db.from("issue_activity").insert({
        issue_id: issue.id,
        action: "created",
      });

      await deleteIssue(issue.id, db);

      // Verify cascade
      const { count: commentCount } = await db
        .from("issue_comments")
        .select("*", { count: "exact", head: true })
        .eq("issue_id", issue.id);

      const { count: activityCount } = await db
        .from("issue_activity")
        .select("*", { count: "exact", head: true })
        .eq("issue_id", issue.id);

      expect(commentCount).toBe(0);
      expect(activityCount).toBe(0);
    });
  });

  describe("insertComment()", () => {
    it("inserts comment with author_id and selects author.full_name", async () => {
      const issue = await insertIssue(
        { project_id: TEST_IDS.project, title: "Comment Test Issue" },
        db,
      );

      const comment = await insertComment(
        {
          issue_id: issue.id,
          author_id: profileId,
          body: "This is a test comment",
        },
        db,
      );

      expect(comment.id).toBeDefined();
      expect(comment.body).toBe("This is a test comment");
      expect(comment.author_id).toBe(profileId);
    });
  });

  describe("updateComment()", () => {
    it("updates comment body", async () => {
      const issue = await insertIssue(
        { project_id: TEST_IDS.project, title: "Update Comment Issue" },
        db,
      );

      const comment = await insertComment(
        { issue_id: issue.id, author_id: profileId, body: "Original body" },
        db,
      );

      const updated = await updateComment(comment.id, "Updated body", db);

      expect(updated.body).toBe("Updated body");
    });
  });

  describe("deleteComment()", () => {
    it("hard deletes the comment", async () => {
      const issue = await insertIssue(
        { project_id: TEST_IDS.project, title: "Delete Comment Issue" },
        db,
      );

      const comment = await insertComment(
        { issue_id: issue.id, author_id: profileId, body: "To be deleted" },
        db,
      );

      await deleteComment(comment.id, db);

      const { data: row } = await db
        .from("issue_comments")
        .select("id")
        .eq("id", comment.id)
        .maybeSingle();

      expect(row).toBeNull();
    });
  });

  describe("insertActivity()", () => {
    it("logs action, field, old_value, new_value", async () => {
      const issue = await insertIssue(
        { project_id: TEST_IDS.project, title: "Activity Test Issue" },
        db,
      );

      await insertActivity(
        {
          issue_id: issue.id,
          action: "field_changed",
          field: "status",
          old_value: "triage",
          new_value: "open",
        },
        db,
      );

      const { data: activity } = await db
        .from("issue_activity")
        .select("action, field, old_value, new_value")
        .eq("issue_id", issue.id)
        .single();

      expect(activity?.action).toBe("field_changed");
      expect(activity?.field).toBe("status");
      expect(activity?.old_value).toBe("triage");
      expect(activity?.new_value).toBe("open");
    });
  });
});
