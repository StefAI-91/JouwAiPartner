import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  seedOrganization,
  seedProject,
  seedProfile,
  seedIssue,
  seedTopic,
  TEST_IDS,
} from "../helpers/seed";
import { cleanupTestData, cleanupTestProfile } from "../helpers/cleanup";
import {
  insertTopic,
  updateTopic,
  deleteTopic,
  updateTopicStatus,
  linkIssueToTopic,
  setTopicForIssue,
  unlinkIssueFromTopic,
} from "../../src/mutations/topics";

let db: ReturnType<typeof getTestClient>;
let profileId: string;

describeWithDb("mutations/topics", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    const profile = await seedProfile({ full_name: "Topics Mutation User" });
    profileId = profile.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestProfile(profileId);
  });

  afterEach(async () => {
    await db.from("topic_issues").delete().in("topic_id", [TEST_IDS.topic, TEST_IDS.topic2]);
    await db.from("topics").delete().in("id", [TEST_IDS.topic, TEST_IDS.topic2]);
    await db.from("issues").delete().in("id", [TEST_IDS.issue, TEST_IDS.issue2, TEST_IDS.issue3]);
  });

  describe("insertTopic / updateTopic / deleteTopic", () => {
    it("inserteert een topic met defaults (status=clustering)", async () => {
      const result = await insertTopic(
        {
          project_id: TEST_IDS.project,
          title: "Nieuw topic",
          type: "bug",
          created_by: profileId,
        },
        db,
      );
      expect(result).toMatchObject({ success: true });
      if (!("data" in result)) throw new Error("expected success");
      expect(result.data.status).toBe("clustering");
      expect(result.data.title).toBe("Nieuw topic");

      // cleanup voor volgende tests
      await db.from("topics").delete().eq("id", result.data.id);
    });

    it("update title via updateTopic, raakt status niet", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic, status: "prioritized" });
      const result = await updateTopic(TEST_IDS.topic, { title: "Aangepast" }, db);
      expect(result).toMatchObject({ success: true });
      if (!("data" in result)) throw new Error("expected success");
      expect(result.data.title).toBe("Aangepast");
      expect(result.data.status).toBe("prioritized");
    });

    it("deleteTopic faalt expliciet als er linked issues zijn", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      await seedIssue({ id: TEST_IDS.issue, title: "Linked issue" });
      await db.from("topic_issues").insert({
        topic_id: TEST_IDS.topic,
        issue_id: TEST_IDS.issue,
        linked_by: profileId,
      });

      const result = await deleteTopic(TEST_IDS.topic, db);
      expect(result).toMatchObject({ error: expect.stringMatching(/gekoppeld/) });
    });

    it("deleteTopic slaagt op een leeg topic", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      const result = await deleteTopic(TEST_IDS.topic, db);
      expect(result).toMatchObject({ success: true });
      const { data: row } = await db
        .from("topics")
        .select("id")
        .eq("id", TEST_IDS.topic)
        .maybeSingle();
      expect(row).toBeNull();
    });
  });

  describe("updateTopicStatus", () => {
    it("zet closed_at bij overgang naar done", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic, status: "in_progress" });
      const result = await updateTopicStatus(TEST_IDS.topic, "done", {}, db);
      expect(result).toMatchObject({ success: true });
      if (!("data" in result)) throw new Error("expected success");
      expect(result.data.status).toBe("done");
      expect(result.data.closed_at).toBeTruthy();
    });

    it("clear closed_at bij overgang van done terug naar in_progress", async () => {
      await seedTopic(profileId, {
        id: TEST_IDS.topic,
        status: "done",
        closed_at: new Date().toISOString(),
      });
      const result = await updateTopicStatus(TEST_IDS.topic, "in_progress", {}, db);
      expect(result).toMatchObject({ success: true });
      if (!("data" in result)) throw new Error("expected success");
      expect(result.data.closed_at).toBeNull();
    });

    it("schrijft wont_do_reason mee bij wont_do", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic, status: "prioritized" });
      const result = await updateTopicStatus(
        TEST_IDS.topic,
        "wont_do",
        { wont_do_reason: "Buiten scope na review met klant" },
        db,
      );
      expect(result).toMatchObject({ success: true });
      if (!("data" in result)) throw new Error("expected success");
      expect(result.data.wont_do_reason).toMatch(/scope/);
      expect(result.data.closed_at).toBeTruthy();
    });
  });

  describe("linkIssueToTopic / unlinkIssueFromTopic", () => {
    it("koppelt een issue aan een topic", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      await seedIssue({ id: TEST_IDS.issue, title: "I1" });

      const result = await linkIssueToTopic(
        TEST_IDS.topic,
        TEST_IDS.issue,
        profileId,
        "manual",
        db,
      );
      expect(result).toMatchObject({ success: true });
    });

    it("faalt expliciet als het issue al aan een ander topic gekoppeld is", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      await seedTopic(profileId, { id: TEST_IDS.topic2, title: "Tweede topic" });
      await seedIssue({ id: TEST_IDS.issue, title: "I1" });

      const first = await linkIssueToTopic(TEST_IDS.topic, TEST_IDS.issue, profileId, "manual", db);
      expect(first).toMatchObject({ success: true });

      const second = await linkIssueToTopic(
        TEST_IDS.topic2,
        TEST_IDS.issue,
        profileId,
        "manual",
        db,
      );
      expect(second).toMatchObject({
        error: expect.stringMatching(/al aan een topic gekoppeld/i),
      });
    });

    it("unlinkIssueFromTopic is idempotent (al-weg = geen fout)", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      const result = await unlinkIssueFromTopic(TEST_IDS.topic, TEST_IDS.issue, db);
      expect(result).toMatchObject({ success: true });
    });
  });

  describe("setTopicForIssue", () => {
    it("UPSERT-pad: reassign van topic A naar topic B laat exact één rij over", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic, title: "Topic A" });
      await seedTopic(profileId, { id: TEST_IDS.topic2, title: "Topic B" });
      await seedIssue({ id: TEST_IDS.issue, title: "Issue X" });

      // Koppel eerst aan topic A
      const first = await setTopicForIssue(TEST_IDS.issue, TEST_IDS.topic, profileId, "manual", db);
      expect(first).toMatchObject({ success: true });

      // Herken naar topic B
      const second = await setTopicForIssue(
        TEST_IDS.issue,
        TEST_IDS.topic2,
        profileId,
        "manual",
        db,
      );
      expect(second).toMatchObject({ success: true });

      // Exact één rij in topic_issues, gekoppeld aan topic B
      const { data: rows } = await db
        .from("topic_issues")
        .select("topic_id")
        .eq("issue_id", TEST_IDS.issue);
      expect(rows).toHaveLength(1);
      expect((rows as { topic_id: string }[])[0].topic_id).toBe(TEST_IDS.topic2);
    });

    it("clear-pad is idempotent: setTopicForIssue(id, null) op issue zonder koppeling geeft success", async () => {
      await seedIssue({ id: TEST_IDS.issue, title: "Issue zonder topic" });

      const result = await setTopicForIssue(TEST_IDS.issue, null, profileId, "manual", db);
      expect(result).toMatchObject({
        success: true,
        data: { issue_id: TEST_IDS.issue, topic_id: null },
      });
    });

    it("set + clear flow: na clear is de rij in topic_issues weg", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic, title: "Topic A" });
      await seedIssue({ id: TEST_IDS.issue, title: "Issue Y" });

      // Koppelen
      await setTopicForIssue(TEST_IDS.issue, TEST_IDS.topic, profileId, "manual", db);

      // Ontkoppelen via null
      const clearResult = await setTopicForIssue(TEST_IDS.issue, null, profileId, "manual", db);
      expect(clearResult).toMatchObject({ success: true });

      // Rij is weg
      const { data: rows } = await db
        .from("topic_issues")
        .select("issue_id")
        .eq("issue_id", TEST_IDS.issue);
      expect(rows).toHaveLength(0);
    });
  });
});
