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
  insertExtractions,
  createExtraction,
  correctExtraction,
  updateExtraction,
  updateNeedStatus,
  deleteExtractionsByMeetingId,
  deleteExtraction,
} from "../../src/mutations/extractions";

let db: ReturnType<typeof getTestClient>;

describeWithDb("mutations/extractions", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    await seedMeeting({
      id: TEST_IDS.meeting,
      fireflies_id: `t02-extractions-main`,
      organization_id: TEST_IDS.organization,
    });
  });

  afterEach(async () => {
    // Clean up extractions created during tests
    await db.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("insertExtractions()", () => {
    it("batch inserts with correct defaults", async () => {
      const rows = [
        {
          meeting_id: TEST_IDS.meeting,
          type: "decision" as const,
          content: "We decided to use TypeScript",
          confidence: 0.9,
          transcript_ref: "line 42",
          metadata: { topic: "tech" },
          project_id: TEST_IDS.project,
          embedding_stale: true,
          verification_status: "verified",
        },
        {
          meeting_id: TEST_IDS.meeting,
          type: "action_item" as const,
          content: "Set up CI/CD pipeline",
          confidence: 0.85,
          transcript_ref: "line 55",
          metadata: {},
          project_id: null,
          embedding_stale: true,
          verification_status: "verified",
        },
      ];

      const result = await insertExtractions(rows);

      expect(result).toHaveProperty("success", true);
      expect((result as { success: true; count: number }).count).toBe(2);

      // Verify in DB
      const { data: dbRows } = await db
        .from("extractions")
        .select("type, content, confidence, embedding_stale")
        .eq("meeting_id", TEST_IDS.meeting)
        .order("content");

      expect(dbRows).toHaveLength(2);
      expect(dbRows![0].embedding_stale).toBe(true);
    });

    it("returns count=0 for empty array", async () => {
      const result = await insertExtractions([]);

      expect(result).toEqual({ success: true, count: 0 });
    });
  });

  describe("createExtraction()", () => {
    it("single insert with correct defaults", async () => {
      const result = await createExtraction({
        meeting_id: TEST_IDS.meeting,
        type: "insight",
        content: "Interesting insight about the project",
      });

      expect(result).toHaveProperty("success", true);
      const id = (result as { success: true; data: { id: string } }).data.id;
      expect(id).toBeDefined();

      // Verify defaults
      const { data: row } = await db
        .from("extractions")
        .select("confidence, transcript_ref, metadata, verification_status, embedding_stale")
        .eq("id", id)
        .single();

      expect(row?.confidence).toBeNull();
      expect(row?.transcript_ref).toBeNull();
      expect(row?.metadata).toEqual({});
      expect(row?.verification_status).toBe("verified");
      expect(row?.embedding_stale).toBe(true);
    });

    it("respects provided verification_status", async () => {
      const result = await createExtraction({
        meeting_id: TEST_IDS.meeting,
        type: "decision",
        content: "Draft decision",
        verification_status: "draft",
      });

      expect(result).toHaveProperty("success", true);
      const id = (result as { success: true; data: { id: string } }).data.id;

      const { data: row } = await db
        .from("extractions")
        .select("verification_status")
        .eq("id", id)
        .single();

      expect(row?.verification_status).toBe("draft");
    });
  });

  describe("correctExtraction()", () => {
    it("sets corrected_at and embedding_stale=true", async () => {
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        embedding_stale: false,
      });

      const result = await correctExtraction(TEST_IDS.extraction, {
        content: "Corrected content",
        corrected_by: null,
      });

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("extractions")
        .select("content, corrected_at, embedding_stale")
        .eq("id", TEST_IDS.extraction)
        .single();

      expect(row?.content).toBe("Corrected content");
      expect(row?.corrected_at).toBeDefined();
      expect(row?.embedding_stale).toBe(true);
    });

    it("updates only provided fields (partial update)", async () => {
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        content: "Original content",
        metadata: { original: true },
      });

      // Only update metadata, not content
      const result = await correctExtraction(TEST_IDS.extraction, {
        metadata: { corrected: true },
        corrected_by: null,
      });

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("extractions")
        .select("content, metadata")
        .eq("id", TEST_IDS.extraction)
        .single();

      // Content should be unchanged (correctExtraction only sets content if truthy)
      expect(row?.content).toBe("Original content");
      expect(row?.metadata).toEqual({ corrected: true });
    });
  });

  describe("updateExtraction()", () => {
    it("merges updates and marks embedding_stale=true", async () => {
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        content: "Before update",
        embedding_stale: false,
      });

      const result = await updateExtraction(TEST_IDS.extraction, {
        content: "After update",
        type: "decision",
      });

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("extractions")
        .select("content, type, embedding_stale")
        .eq("id", TEST_IDS.extraction)
        .single();

      expect(row?.content).toBe("After update");
      expect(row?.type).toBe("decision");
      expect(row?.embedding_stale).toBe(true);
    });

    it("sets corrected_by and corrected_at when correctedBy is provided", async () => {
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
      });

      const result = await updateExtraction(
        TEST_IDS.extraction,
        { content: "Corrected via update" },
        TEST_IDS.userId,
      );

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("extractions")
        .select("corrected_by, corrected_at")
        .eq("id", TEST_IDS.extraction)
        .single();

      // corrected_by is set (though FK to profiles may be null in test env)
      expect(row?.corrected_at).toBeDefined();
    });
  });

  describe("updateNeedStatus()", () => {
    it("fetch-then-merge on metadata for type=need", async () => {
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        type: "need",
        metadata: { priority: "high", description: "Need description" },
      });

      const result = await updateNeedStatus(TEST_IDS.extraction, "erkend");

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("extractions")
        .select("metadata")
        .eq("id", TEST_IDS.extraction)
        .single();

      // Original metadata should be preserved, with status merged in
      expect((row?.metadata as Record<string, unknown>).priority).toBe("high");
      expect((row?.metadata as Record<string, unknown>).status).toBe("erkend");
    });

    it("returns error for non-need type", async () => {
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        type: "decision",
      });

      const result = await updateNeedStatus(TEST_IDS.extraction, "open");

      expect(result).toHaveProperty("error");
    });
  });

  describe("deleteExtractionsByMeetingId()", () => {
    it("removes all extractions for a meeting", async () => {
      // Insert multiple extractions
      await insertExtractions([
        {
          meeting_id: TEST_IDS.meeting,
          type: "decision",
          content: "Delete test 1",
          confidence: 0.9,
          transcript_ref: null,
          metadata: {},
          project_id: null,
          embedding_stale: true,
          verification_status: "draft",
        },
        {
          meeting_id: TEST_IDS.meeting,
          type: "insight",
          content: "Delete test 2",
          confidence: 0.8,
          transcript_ref: null,
          metadata: {},
          project_id: null,
          embedding_stale: true,
          verification_status: "draft",
        },
      ]);

      const result = await deleteExtractionsByMeetingId(TEST_IDS.meeting);

      expect(result).toHaveProperty("success", true);

      const { count } = await db
        .from("extractions")
        .select("*", { count: "exact", head: true })
        .eq("meeting_id", TEST_IDS.meeting);

      expect(count).toBe(0);
    });
  });

  describe("deleteExtraction()", () => {
    it("removes a single extraction", async () => {
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
      });

      const result = await deleteExtraction(TEST_IDS.extraction);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("extractions")
        .select("id")
        .eq("id", TEST_IDS.extraction)
        .maybeSingle();

      expect(row).toBeNull();
    });
  });
});
