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
import { listDraftMeetings, getDraftMeetingById, getReviewStats } from "../../src/queries/review";

let db: ReturnType<typeof getTestClient>;

describeWithDb("queries/review", () => {
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

  describe("listDraftMeetings()", () => {
    it("returns only draft meetings ordered by date DESC", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "draft",
        title: "Draft A",
        date: "2026-01-10T10:00:00Z",
      });
      await seedMeeting({
        id: TEST_IDS.meeting2,
        verification_status: "verified",
        title: "Verified B",
        date: "2026-01-11T10:00:00Z",
        fireflies_id: `test-ff-review-${Date.now()}`,
      });

      const result = await listDraftMeetings(db);

      const ids = result.map((m) => m.id);
      expect(ids).toContain(TEST_IDS.meeting);
      expect(ids).not.toContain(TEST_IDS.meeting2);
    });

    it("includes participants and extractions in joins", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "draft",
        organization_id: TEST_IDS.organization,
      });
      await db.from("meeting_participants").insert({
        meeting_id: TEST_IDS.meeting,
        person_id: TEST_IDS.person,
      });
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        type: "decision",
        content: "Test decision",
      });

      const result = await listDraftMeetings(db);
      const meeting = result.find((m) => m.id === TEST_IDS.meeting);

      expect(meeting).toBeDefined();
      expect(meeting!.meeting_participants.length).toBeGreaterThanOrEqual(1);
      expect(meeting!.extractions.length).toBeGreaterThanOrEqual(1);
      expect(meeting!.organization).not.toBeNull();
    });
  });

  describe("getDraftMeetingById()", () => {
    it("returns detail for a draft meeting", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "draft",
        title: "Draft Detail",
        summary: "Draft summary",
      });

      const result = await getDraftMeetingById(TEST_IDS.meeting, db);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEST_IDS.meeting);
      expect(result!.title).toBe("Draft Detail");
      expect(result!.summary).toBe("Draft summary");
    });

    it("returns null for a verified meeting", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "verified",
      });

      const result = await getDraftMeetingById(TEST_IDS.meeting, db);

      expect(result).toBeNull();
    });

    it("returns null for non-existent id", async () => {
      const result = await getDraftMeetingById("00000000-0000-0000-0000-ffffffffffff", db);

      expect(result).toBeNull();
    });
  });

  describe("getReviewStats()", () => {
    it("returns verifiedToday and totalVerified counts", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "verified",
        verified_at: new Date().toISOString(),
      });

      const result = await getReviewStats(db);

      expect(result).toHaveProperty("verifiedToday");
      expect(result).toHaveProperty("totalVerified");
      expect(typeof result.verifiedToday).toBe("number");
      expect(typeof result.totalVerified).toBe("number");
      expect(result.totalVerified).toBeGreaterThanOrEqual(1);
      expect(result.verifiedToday).toBeGreaterThanOrEqual(1);
    });
  });
});
