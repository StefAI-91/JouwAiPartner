import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  seedOrganization,
  seedProject,
  seedMeeting,
  seedExtraction,
  seedPerson,
  TEST_IDS,
} from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import { updateRowEmbedding, batchUpdateEmbeddings } from "../../src/mutations/embeddings";

let db: ReturnType<typeof getTestClient>;

// Generate a deterministic 1024-dim embedding for testing
function makeFakeEmbedding(seed: number): number[] {
  return Array.from({ length: 1024 }, (_, i) => Math.sin(seed + i) * 0.1);
}

describeWithDb("mutations/embeddings", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    await seedPerson();
    await seedMeeting({
      id: TEST_IDS.meeting,
      fireflies_id: "t02-embeddings-main",
      organization_id: TEST_IDS.organization,
      embedding_stale: true,
    });
    await seedExtraction({
      id: TEST_IDS.extraction,
      meeting_id: TEST_IDS.meeting,
    });
  });

  afterEach(async () => {
    // Reset embedding_stale flags
    await db.from("meetings").update({ embedding_stale: true }).eq("id", TEST_IDS.meeting);
    await db.from("extractions").update({ embedding_stale: true }).eq("id", TEST_IDS.extraction);
    await db.from("projects").update({ embedding_stale: true }).eq("id", TEST_IDS.project);
    await db.from("people").update({ embedding_stale: true }).eq("id", TEST_IDS.person);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("updateRowEmbedding()", () => {
    it("writes vector for meetings and sets embedding_stale=false", async () => {
      const embedding = makeFakeEmbedding(1);

      const result = await updateRowEmbedding("meetings", TEST_IDS.meeting, embedding);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("meetings")
        .select("embedding_stale")
        .eq("id", TEST_IDS.meeting)
        .single();

      expect(row?.embedding_stale).toBe(false);
    });

    it("writes vector for extractions", async () => {
      const embedding = makeFakeEmbedding(2);

      const result = await updateRowEmbedding("extractions", TEST_IDS.extraction, embedding);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("extractions")
        .select("embedding_stale")
        .eq("id", TEST_IDS.extraction)
        .single();

      expect(row?.embedding_stale).toBe(false);
    });

    it("writes vector for projects", async () => {
      const embedding = makeFakeEmbedding(3);

      const result = await updateRowEmbedding("projects", TEST_IDS.project, embedding);

      expect(result).toHaveProperty("success", true);

      // Projects don't have embedding_stale in the base migration, but it was added later.
      // Just verify success.
    });

    it("writes vector for people", async () => {
      const embedding = makeFakeEmbedding(4);

      const result = await updateRowEmbedding("people", TEST_IDS.person, embedding);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("people")
        .select("embedding_stale")
        .eq("id", TEST_IDS.person)
        .single();

      expect(row?.embedding_stale).toBe(false);
    });
  });

  describe("batchUpdateEmbeddings()", () => {
    it("updates multiple rows via RPC", async () => {
      const embeddings = [makeFakeEmbedding(10), makeFakeEmbedding(11)];

      // We only have one meeting and one extraction for this test,
      // so test with extractions — create a second one
      const { data: ext2 } = await db
        .from("extractions")
        .insert({
          meeting_id: TEST_IDS.meeting,
          type: "insight",
          content: "Batch embed test",
          confidence: 0.5,
          verification_status: "draft",
          embedding_stale: true,
        })
        .select("id")
        .single();

      const ids = [TEST_IDS.extraction, ext2!.id];

      const result = await batchUpdateEmbeddings("extractions", ids, embeddings);

      expect(result).toHaveProperty("success", true);

      // Verify both have embedding_stale=false
      const { data: rows } = await db
        .from("extractions")
        .select("id, embedding_stale")
        .in("id", ids);

      for (const row of rows ?? []) {
        expect(row.embedding_stale).toBe(false);
      }

      // Cleanup extra extraction
      await db.from("extractions").delete().eq("id", ext2!.id);
    });

    it("returns error when ids and embeddings arrays differ in length", async () => {
      const result = await batchUpdateEmbeddings(
        "meetings",
        [TEST_IDS.meeting],
        [makeFakeEmbedding(1), makeFakeEmbedding(2)],
      );

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("same length");
    });

    it("returns success for empty ids array", async () => {
      const result = await batchUpdateEmbeddings("meetings", [], []);

      expect(result).toHaveProperty("success", true);
    });
  });
});
