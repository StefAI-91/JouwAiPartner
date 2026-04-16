import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  seedOrganization,
  seedProject,
  seedPerson,
  seedMeeting,
  seedExtraction,
  TEST_IDS,
} from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import {
  getVerifiedMeetingById,
  listVerifiedMeetings,
  listBoardMeetings,
  getExistingFirefliesIds,
  getExistingMeetingsByTitleDates,
  getMeetingByTitleAndDate,
  getMeetingForEmbedding,
  getExtractionIdsAndContent,
  getMeetingExtractions,
  getMeetingExtractionsBatch,
} from "../../src/queries/meetings";

let db: ReturnType<typeof getTestClient>;

describeWithDb("queries/meetings", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    await seedPerson();
  });

  afterEach(async () => {
    await db.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting);
    await db.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting2);
    await db.from("meeting_participants").delete().eq("meeting_id", TEST_IDS.meeting);
    await db.from("meeting_projects").delete().eq("meeting_id", TEST_IDS.meeting);
    await db.from("meetings").delete().eq("id", TEST_IDS.meeting);
    await db.from("meetings").delete().eq("id", TEST_IDS.meeting2);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("getVerifiedMeetingById()", () => {
    it("returns MeetingDetail for a verified meeting", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "verified",
        title: "Verified Meeting",
      });
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        type: "decision",
        content: "We decided to ship",
      });

      const result = await getVerifiedMeetingById(TEST_IDS.meeting, db);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEST_IDS.meeting);
      expect(result!.title).toBe("Verified Meeting");
      expect(result!.verification_status).toBe("verified");
      expect(result!.extractions).toHaveLength(1);
      expect(result!.extractions[0].content).toBe("We decided to ship");
    });

    it("returns null for a draft meeting", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "draft",
      });

      const result = await getVerifiedMeetingById(TEST_IDS.meeting, db);

      expect(result).toBeNull();
    });

    it("returns null for a rejected meeting", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "rejected",
      });

      const result = await getVerifiedMeetingById(TEST_IDS.meeting, db);

      expect(result).toBeNull();
    });

    it("returns null for non-existent id", async () => {
      const result = await getVerifiedMeetingById("00000000-0000-0000-0000-ffffffffffff", db);

      expect(result).toBeNull();
    });
  });

  describe("listVerifiedMeetings()", () => {
    it("returns only verified meetings ordered by date DESC", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "verified",
        title: "Verified One",
        date: "2026-01-10T10:00:00Z",
      });
      await seedMeeting({
        id: TEST_IDS.meeting2,
        verification_status: "draft",
        title: "Draft One",
        date: "2026-01-11T10:00:00Z",
        fireflies_id: `test-ff-draft-${Date.now()}`,
      });

      const { data, total } = await listVerifiedMeetings(db, { limit: 50 });

      const ids = data.map((m) => m.id);
      expect(ids).toContain(TEST_IDS.meeting);
      expect(ids).not.toContain(TEST_IDS.meeting2);
      expect(total).toBeGreaterThanOrEqual(1);
    });

    it("respects limit and offset", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "verified",
        title: "Meeting A",
        date: "2026-01-10T10:00:00Z",
      });

      const { data } = await listVerifiedMeetings(db, { limit: 1, offset: 0 });

      expect(data.length).toBeLessThanOrEqual(1);
    });
  });

  describe("listBoardMeetings()", () => {
    it("returns only verified board meetings ordered by date DESC", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "verified",
        meeting_type: "board",
        title: "Board verified",
        date: "2026-02-01T10:00:00Z",
      });
      await seedMeeting({
        id: TEST_IDS.meeting2,
        verification_status: "verified",
        meeting_type: "team_sync",
        title: "Team sync verified",
        date: "2026-02-02T10:00:00Z",
        fireflies_id: `test-ff-team-${Date.now()}`,
      });

      const { data } = await listBoardMeetings(db, { limit: 50 });

      const ids = data.map((m) => m.id);
      expect(ids).toContain(TEST_IDS.meeting);
      expect(ids).not.toContain(TEST_IDS.meeting2);
    });

    it("excludes draft board meetings", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "draft",
        meeting_type: "board",
      });

      const { data } = await listBoardMeetings(db, { limit: 50 });

      expect(data.map((m) => m.id)).not.toContain(TEST_IDS.meeting);
    });

    it("counts decisions and action_items per meeting", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "verified",
        meeting_type: "board",
        title: "Board with extractions",
      });
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        type: "decision",
      });
      await seedExtraction({
        id: TEST_IDS.extraction2,
        meeting_id: TEST_IDS.meeting,
        type: "action_item",
      });

      const { data } = await listBoardMeetings(db, { limit: 50 });
      const found = data.find((m) => m.id === TEST_IDS.meeting);

      expect(found?.decision_count).toBe(1);
      expect(found?.action_item_count).toBe(1);
    });
  });

  describe("getExistingFirefliesIds()", () => {
    it("returns Set of existing fireflies_ids from input", async () => {
      const ffId = `test-ff-existing-${Date.now()}`;
      await seedMeeting({ id: TEST_IDS.meeting, fireflies_id: ffId });

      const result = await getExistingFirefliesIds([ffId, "non-existent-ff-id"]);

      expect(result).toBeInstanceOf(Set);
      expect(result.has(ffId)).toBe(true);
      expect(result.has("non-existent-ff-id")).toBe(false);
    });

    it("returns empty Set for empty input", async () => {
      const result = await getExistingFirefliesIds([]);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });
  });

  describe("getExistingMeetingsByTitleDates()", () => {
    it("returns Map with case-insensitive title matching at day level", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        title: "Sprint Planning",
        date: "2026-03-15T14:00:00Z",
      });

      const result = await getExistingMeetingsByTitleDates([
        { title: "Sprint Planning", date: "2026-03-15T10:00:00Z" },
      ]);

      expect(result).toBeInstanceOf(Map);
      expect(result.get("sprint planning|2026-03-15")).toBe(TEST_IDS.meeting);
    });

    it("returns empty Map for empty input", async () => {
      const result = await getExistingMeetingsByTitleDates([]);

      expect(result.size).toBe(0);
    });
  });

  describe("getMeetingByTitleAndDate()", () => {
    it("matches on ilike title + date range (same day)", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        title: "Daily Standup",
        date: "2026-04-01T09:00:00Z",
      });

      const result = await getMeetingByTitleAndDate("Daily Standup", "2026-04-01T15:00:00Z");

      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEST_IDS.meeting);
    });

    it("returns null when no match", async () => {
      const result = await getMeetingByTitleAndDate("Non Existent Meeting", "2026-04-01T15:00:00Z");

      expect(result).toBeNull();
    });
  });

  describe("getMeetingForEmbedding()", () => {
    it("returns title, participants, summary", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        title: "Embed Meeting",
        participants: ["Alice", "Bob"],
        summary: "Discussed embeddings",
      });

      const result = await getMeetingForEmbedding(TEST_IDS.meeting);

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Embed Meeting");
      expect(result!.participants).toEqual(["Alice", "Bob"]);
      expect(result!.summary).toBe("Discussed embeddings");
    });

    it("returns null for non-existent meeting", async () => {
      const result = await getMeetingForEmbedding("00000000-0000-0000-0000-ffffffffffff");

      expect(result).toBeNull();
    });
  });

  describe("getExtractionIdsAndContent()", () => {
    it("returns extraction ids and content for a meeting", async () => {
      await seedMeeting({ id: TEST_IDS.meeting });
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        content: "Test content",
      });

      const result = await getExtractionIdsAndContent(TEST_IDS.meeting);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TEST_IDS.extraction);
      expect(result[0].content).toBe("Test content");
    });

    it("returns empty array for meeting without extractions", async () => {
      await seedMeeting({ id: TEST_IDS.meeting });

      const result = await getExtractionIdsAndContent(TEST_IDS.meeting);

      expect(result).toEqual([]);
    });
  });

  describe("getMeetingExtractions()", () => {
    it("returns extractions with type, content, confidence, transcript_ref", async () => {
      await seedMeeting({ id: TEST_IDS.meeting });
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        type: "action_item",
        content: "Fix the bug",
        confidence: 0.85,
        transcript_ref: "00:05:30",
      });

      const result = await getMeetingExtractions(TEST_IDS.meeting);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("action_item");
      expect(result[0].content).toBe("Fix the bug");
      expect(result[0].confidence).toBe(0.85);
    });
  });

  describe("getMeetingExtractionsBatch()", () => {
    it("returns Map of meetingId to extractions", async () => {
      await seedMeeting({ id: TEST_IDS.meeting, title: "Meeting A" });
      await seedMeeting({
        id: TEST_IDS.meeting2,
        title: "Meeting B",
        fireflies_id: `test-ff-batch-${Date.now()}`,
        date: "2026-01-12T10:00:00Z",
      });
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        content: "Content A",
      });
      await seedExtraction({
        id: TEST_IDS.extraction2,
        meeting_id: TEST_IDS.meeting2,
        content: "Content B",
      });

      const result = await getMeetingExtractionsBatch([TEST_IDS.meeting, TEST_IDS.meeting2]);

      expect(result).toBeInstanceOf(Map);
      expect(result.get(TEST_IDS.meeting)).toHaveLength(1);
      expect(result.get(TEST_IDS.meeting2)).toHaveLength(1);
      expect(result.get(TEST_IDS.meeting)![0].content).toBe("Content A");
    });

    it("returns empty Map for empty input", async () => {
      const result = await getMeetingExtractionsBatch([]);

      expect(result.size).toBe(0);
    });
  });
});
