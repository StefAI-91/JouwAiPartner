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
  countIssuesPerTopic,
  getIssuesForTopic,
  getTopicById,
  getTopicWithIssues,
  listTopics,
  listTopicsByBucket,
} from "../../src/queries/topics";

let db: ReturnType<typeof getTestClient>;
let profileId: string;

describeWithDb("queries/topics", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    const profile = await seedProfile({ full_name: "Topics Test User" });
    profileId = profile.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestProfile(profileId);
  });

  afterEach(async () => {
    await db.from("topic_issues").delete().eq("topic_id", TEST_IDS.topic);
    await db.from("topic_issues").delete().eq("topic_id", TEST_IDS.topic2);
    await db.from("topics").delete().eq("id", TEST_IDS.topic);
    await db.from("topics").delete().eq("id", TEST_IDS.topic2);
    await db.from("issues").delete().in("id", [TEST_IDS.issue, TEST_IDS.issue2, TEST_IDS.issue3]);
  });

  describe("listTopics()", () => {
    it("retourneert topics gefilterd per project", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic, title: "Bug A", type: "bug" });
      await seedTopic(profileId, {
        id: TEST_IDS.topic2,
        title: "Feature B",
        type: "feature",
      });

      const rows = await listTopics(TEST_IDS.project, {}, db);
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(TEST_IDS.topic);
      expect(ids).toContain(TEST_IDS.topic2);
    });

    it("filtert op type als die meegegeven is", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic, title: "Bug X", type: "bug" });
      await seedTopic(profileId, { id: TEST_IDS.topic2, title: "Feat Y", type: "feature" });

      const rows = await listTopics(TEST_IDS.project, { type: "bug" }, db);
      expect(rows.every((r) => r.type === "bug")).toBe(true);
      expect(rows.map((r) => r.id)).toContain(TEST_IDS.topic);
      expect(rows.map((r) => r.id)).not.toContain(TEST_IDS.topic2);
    });
  });

  describe("listTopicsByBucket()", () => {
    it("groepeert topics op portal-bucket en verbergt clustering-statuses", async () => {
      await seedTopic(profileId, {
        id: TEST_IDS.topic,
        title: "Nog clusteren",
        status: "clustering",
      });
      await seedTopic(profileId, {
        id: TEST_IDS.topic2,
        title: "Wachten op klant",
        status: "awaiting_client_input",
      });

      const buckets = await listTopicsByBucket(TEST_IDS.project, null, db);
      const allIds = Object.values(buckets)
        .flat()
        .map((t) => t.id);
      expect(allIds).not.toContain(TEST_IDS.topic);
      expect(buckets.awaiting_input.map((t) => t.id)).toContain(TEST_IDS.topic2);
    });
  });

  describe("getTopicById() en getTopicWithIssues()", () => {
    it("retourneert null voor een onbekend id", async () => {
      const result = await getTopicById("00000000-0000-0000-0000-0000000000ff", db);
      expect(result).toBeNull();
    });

    it("retourneert topic + 2 linked issues in één call (geen N+1)", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic, title: "Detail topic" });
      await seedIssue({ id: TEST_IDS.issue, title: "Issue A", priority: "high" });
      await seedIssue({ id: TEST_IDS.issue2, title: "Issue B", priority: "medium" });

      await db.from("topic_issues").insert([
        {
          topic_id: TEST_IDS.topic,
          issue_id: TEST_IDS.issue,
          linked_by: profileId,
        },
        {
          topic_id: TEST_IDS.topic,
          issue_id: TEST_IDS.issue2,
          linked_by: profileId,
        },
      ]);

      const result = await getTopicWithIssues(TEST_IDS.topic, db);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEST_IDS.topic);
      expect(result!.linked_issues.map((i) => i.id).sort()).toEqual(
        [TEST_IDS.issue, TEST_IDS.issue2].sort(),
      );
    });
  });

  describe("countIssuesPerTopic() en getIssuesForTopic()", () => {
    it("telt issues per topic in één query", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      await seedTopic(profileId, { id: TEST_IDS.topic2 });
      await seedIssue({ id: TEST_IDS.issue, title: "I1" });
      await seedIssue({ id: TEST_IDS.issue2, title: "I2" });
      await seedIssue({ id: TEST_IDS.issue3, title: "I3" });

      await db.from("topic_issues").insert([
        { topic_id: TEST_IDS.topic, issue_id: TEST_IDS.issue, linked_by: profileId },
        { topic_id: TEST_IDS.topic, issue_id: TEST_IDS.issue2, linked_by: profileId },
        { topic_id: TEST_IDS.topic2, issue_id: TEST_IDS.issue3, linked_by: profileId },
      ]);

      const counts = await countIssuesPerTopic([TEST_IDS.topic, TEST_IDS.topic2], db);
      expect(counts.get(TEST_IDS.topic)).toBe(2);
      expect(counts.get(TEST_IDS.topic2)).toBe(1);
    });

    it("retourneert lege Map voor een lege ids-array zonder DB-call", async () => {
      const counts = await countIssuesPerTopic([], db);
      expect(counts.size).toBe(0);
    });

    it("getIssuesForTopic geeft de gekoppelde issues op één topic", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      await seedIssue({ id: TEST_IDS.issue, title: "I1" });
      await db.from("topic_issues").insert({
        topic_id: TEST_IDS.topic,
        issue_id: TEST_IDS.issue,
        linked_by: profileId,
      });

      const issues = await getIssuesForTopic(TEST_IDS.topic, db);
      expect(issues.map((i) => i.id)).toEqual([TEST_IDS.issue]);
    });
  });
});
