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
  countOpenIssuesPerTopic,
  getIssuesForTopic,
  getTopicById,
  getTopicWithIssues,
  listTopics,
  listTopicsByBucket,
  listTopicSampleIssues,
  getTopicMembershipForIssues,
  getLinkedIssueIdsInProject,
  getIssueIdsForTopics,
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
      await seedIssue({ id: TEST_IDS.issue, title: "Issue A", priority: "p1" });
      await seedIssue({ id: TEST_IDS.issue2, title: "Issue B", priority: "p2" });

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

  describe("getTopicMembershipForIssues()", () => {
    it("cross-project isolation: geeft de juiste topic-info per issue, geen kruisbestuiving", async () => {
      // Project A: topic + issue A
      await seedTopic(profileId, { id: TEST_IDS.topic, title: "Topic Proj A" });
      await seedIssue({ id: TEST_IDS.issue, title: "Issue Proj A" });
      await db.from("topic_issues").insert({
        topic_id: TEST_IDS.topic,
        issue_id: TEST_IDS.issue,
        linked_by: profileId,
      });

      // Project B: eigen project + topic + issue
      await seedProject({ id: TEST_IDS.project2, name: "Project B" });
      await seedTopic(profileId, {
        id: TEST_IDS.topic2,
        title: "Topic Proj B",
        project_id: TEST_IDS.project2,
      });
      await seedIssue({
        id: TEST_IDS.issue2,
        title: "Issue Proj B",
        project_id: TEST_IDS.project2,
      });
      await db.from("topic_issues").insert({
        topic_id: TEST_IDS.topic2,
        issue_id: TEST_IDS.issue2,
        linked_by: profileId,
      });

      const map = await getTopicMembershipForIssues([TEST_IDS.issue, TEST_IDS.issue2], db);

      expect(map.get(TEST_IDS.issue)).toMatchObject({
        id: TEST_IDS.topic,
        title: "Topic Proj A",
      });
      expect(map.get(TEST_IDS.issue2)).toMatchObject({
        id: TEST_IDS.topic2,
        title: "Topic Proj B",
      });

      // Cleanup extra project
      await db.from("projects").delete().eq("id", TEST_IDS.project2);
    });

    it("issues zonder topic staan niet in de result-Map", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      await seedIssue({ id: TEST_IDS.issue, title: "Met topic" });
      await seedIssue({ id: TEST_IDS.issue2, title: "Zonder topic" });

      await db.from("topic_issues").insert({
        topic_id: TEST_IDS.topic,
        issue_id: TEST_IDS.issue,
        linked_by: profileId,
      });

      const map = await getTopicMembershipForIssues([TEST_IDS.issue, TEST_IDS.issue2], db);

      expect(map.has(TEST_IDS.issue)).toBe(true);
      expect(map.has(TEST_IDS.issue2)).toBe(false);
    });
  });

  describe("getLinkedIssueIdsInProject()", () => {
    it("geeft alleen de issue-ids van het gevraagde project, niet van een ander project", async () => {
      // Project A: topic met issues X en Y
      await seedTopic(profileId, { id: TEST_IDS.topic, title: "Topic A" });
      await seedIssue({ id: TEST_IDS.issue, title: "X" });
      await seedIssue({ id: TEST_IDS.issue2, title: "Y" });
      await db.from("topic_issues").insert([
        { topic_id: TEST_IDS.topic, issue_id: TEST_IDS.issue, linked_by: profileId },
        { topic_id: TEST_IDS.topic, issue_id: TEST_IDS.issue2, linked_by: profileId },
      ]);

      // Project B: eigen topic + issue Z
      await seedProject({ id: TEST_IDS.project2, name: "Project B" });
      await seedTopic(profileId, {
        id: TEST_IDS.topic2,
        title: "Topic B",
        project_id: TEST_IDS.project2,
      });
      await seedIssue({ id: TEST_IDS.issue3, title: "Z", project_id: TEST_IDS.project2 });
      await db.from("topic_issues").insert({
        topic_id: TEST_IDS.topic2,
        issue_id: TEST_IDS.issue3,
        linked_by: profileId,
      });

      const idsA = await getLinkedIssueIdsInProject(TEST_IDS.project, db);
      expect(idsA.sort()).toEqual([TEST_IDS.issue, TEST_IDS.issue2].sort());
      expect(idsA).not.toContain(TEST_IDS.issue3);

      // Cleanup extra project
      await db.from("projects").delete().eq("id", TEST_IDS.project2);
    });

    it("lege state: project zonder topics geeft lege array", async () => {
      const ids = await getLinkedIssueIdsInProject(TEST_IDS.project, db);
      expect(ids).toEqual([]);
    });

    it("lege state: project met topics maar zonder koppelingen geeft lege array", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      const ids = await getLinkedIssueIdsInProject(TEST_IDS.project, db);
      expect(ids).toEqual([]);
    });
  });

  describe("getIssueIdsForTopics()", () => {
    it("empty-input early-return: roep aan met [] → returns [] zonder error", async () => {
      const ids = await getIssueIdsForTopics([], db);
      expect(ids).toEqual([]);
    });
  });

  describe("countOpenIssuesPerTopic()", () => {
    it("telt alleen open-status issues per topic, sluit done en cancelled uit", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      await seedIssue({ id: TEST_IDS.issue, title: "todo issue", status: "todo" });
      await seedIssue({ id: TEST_IDS.issue2, title: "done issue", status: "done" });
      await seedIssue({ id: TEST_IDS.issue3, title: "triage issue", status: "triage" });
      await db.from("topic_issues").insert([
        { topic_id: TEST_IDS.topic, issue_id: TEST_IDS.issue, linked_by: profileId },
        { topic_id: TEST_IDS.topic, issue_id: TEST_IDS.issue2, linked_by: profileId },
        { topic_id: TEST_IDS.topic, issue_id: TEST_IDS.issue3, linked_by: profileId },
      ]);

      const counts = await countOpenIssuesPerTopic([TEST_IDS.topic], db);
      // todo + triage = 2 open; done valt buiten.
      expect(counts.get(TEST_IDS.topic)).toBe(2);
    });

    it("retourneert 0 voor een topic zonder open-status koppelingen", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      await seedIssue({ id: TEST_IDS.issue, title: "done", status: "done" });
      await db.from("topic_issues").insert({
        topic_id: TEST_IDS.topic,
        issue_id: TEST_IDS.issue,
        linked_by: profileId,
      });

      const counts = await countOpenIssuesPerTopic([TEST_IDS.topic], db);
      expect(counts.get(TEST_IDS.topic)).toBe(0);
    });

    it("empty-input early-return: geeft lege Map zonder error", async () => {
      const counts = await countOpenIssuesPerTopic([], db);
      expect(counts.size).toBe(0);
    });
  });

  describe("listTopicSampleIssues()", () => {
    it("retourneert max 5 issue-titels per topic, meest recent gekoppeld eerst", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      await seedIssue({ id: TEST_IDS.issue, title: "Oudste" });
      await seedIssue({ id: TEST_IDS.issue2, title: "Midden" });
      await seedIssue({ id: TEST_IDS.issue3, title: "Nieuwste" });

      // Insert in chronologische volgorde met expliciete linked_at zodat de
      // sortering deterministisch is (dezelfde-millisecond inserts kunnen
      // anders willekeurig terugkomen).
      const t0 = "2026-04-01T10:00:00Z";
      const t1 = "2026-04-01T11:00:00Z";
      const t2 = "2026-04-01T12:00:00Z";
      await db.from("topic_issues").insert([
        {
          topic_id: TEST_IDS.topic,
          issue_id: TEST_IDS.issue,
          linked_by: profileId,
          linked_at: t0,
        },
        {
          topic_id: TEST_IDS.topic,
          issue_id: TEST_IDS.issue2,
          linked_by: profileId,
          linked_at: t1,
        },
        {
          topic_id: TEST_IDS.topic,
          issue_id: TEST_IDS.issue3,
          linked_by: profileId,
          linked_at: t2,
        },
      ]);

      const result = await listTopicSampleIssues([TEST_IDS.topic], db);
      expect(result.get(TEST_IDS.topic)).toEqual(["Nieuwste", "Midden", "Oudste"]);
    });

    it("groepeert per topic en isoleert tussen topics", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });
      await seedTopic(profileId, { id: TEST_IDS.topic2 });
      await seedIssue({ id: TEST_IDS.issue, title: "A" });
      await seedIssue({ id: TEST_IDS.issue2, title: "B" });
      await db.from("topic_issues").insert([
        { topic_id: TEST_IDS.topic, issue_id: TEST_IDS.issue, linked_by: profileId },
        { topic_id: TEST_IDS.topic2, issue_id: TEST_IDS.issue2, linked_by: profileId },
      ]);

      const result = await listTopicSampleIssues([TEST_IDS.topic, TEST_IDS.topic2], db);
      expect(result.get(TEST_IDS.topic)).toEqual(["A"]);
      expect(result.get(TEST_IDS.topic2)).toEqual(["B"]);
    });

    it("empty-input early-return: roep aan met [] → returns lege Map zonder error", async () => {
      const result = await listTopicSampleIssues([], db);
      expect(result.size).toBe(0);
    });

    it("topic zonder gekoppelde issues staat niet in de Map", async () => {
      await seedTopic(profileId, { id: TEST_IDS.topic });

      const result = await listTopicSampleIssues([TEST_IDS.topic], db);
      expect(result.has(TEST_IDS.topic)).toBe(false);
    });
  });
});
