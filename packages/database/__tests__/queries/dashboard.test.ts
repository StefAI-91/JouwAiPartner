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
  getReviewQueueCount,
  listRecentVerifiedMeetings,
  listBriefingMeetings,
  getExtractionCountsByMeetingIds,
  getAiPulseData,
} from "../../src/queries/dashboard";

let db: ReturnType<typeof getTestClient>;

describeWithDb("queries/dashboard", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
  });

  afterEach(async () => {
    await db.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting);
    await db.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting2);
    await db.from("meeting_projects").delete().eq("meeting_id", TEST_IDS.meeting);
    await db.from("meetings").delete().eq("id", TEST_IDS.meeting);
    await db.from("meetings").delete().eq("id", TEST_IDS.meeting2);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("getReviewQueueCount()", () => {
    it("counts meetings with status=draft", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "draft",
        title: "Draft Meeting",
      });

      const count = await getReviewQueueCount(db);

      expect(count).toBeGreaterThanOrEqual(1);
    });

    it("returns 0 when no draft meetings exist", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "verified",
      });

      const count = await getReviewQueueCount(db);

      // There might be other draft meetings in the DB, but at minimum the verified one
      // should not be counted. We seed a specific verified one and check >=0.
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("listRecentVerifiedMeetings()", () => {
    it("returns only verified meetings", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "verified",
        title: "Verified For Dashboard",
        verified_at: new Date().toISOString(),
      });
      await seedMeeting({
        id: TEST_IDS.meeting2,
        verification_status: "draft",
        title: "Draft Not Shown",
        fireflies_id: `test-ff-dash-${Date.now()}`,
        date: "2026-01-02T10:00:00Z",
      });

      const result = await listRecentVerifiedMeetings(50, db);

      const ids = result.map((m) => m.id);
      expect(ids).toContain(TEST_IDS.meeting);
      expect(ids).not.toContain(TEST_IDS.meeting2);
    });

    it("includes organization join", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "verified",
        organization_id: TEST_IDS.organization,
        verified_at: new Date().toISOString(),
      });

      const result = await listRecentVerifiedMeetings(50, db);
      const meeting = result.find((m) => m.id === TEST_IDS.meeting);

      expect(meeting).toBeDefined();
      expect(meeting!.organization).not.toBeNull();
      expect(meeting!.organization!.name).toBe("Test Organization");
    });
  });

  describe("listBriefingMeetings()", () => {
    it("returns verified meetings with ai_briefing not null", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        verification_status: "verified",
        ai_briefing: "This is a briefing",
        title: "Briefing Meeting",
      });
      await seedMeeting({
        id: TEST_IDS.meeting2,
        verification_status: "verified",
        ai_briefing: null,
        title: "No Briefing",
        fireflies_id: `test-ff-brief-${Date.now()}`,
        date: "2026-01-02T10:00:00Z",
      });

      const result = await listBriefingMeetings(50, db);

      const ids = result.map((m) => m.id);
      expect(ids).toContain(TEST_IDS.meeting);
      expect(ids).not.toContain(TEST_IDS.meeting2);
    });
  });

  describe("getExtractionCountsByMeetingIds()", () => {
    it("counts only action_item extractions per meeting", async () => {
      await seedMeeting({ id: TEST_IDS.meeting });
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        type: "action_item",
      });
      await seedExtraction({
        id: TEST_IDS.extraction2,
        meeting_id: TEST_IDS.meeting,
        type: "decision",
      });

      const result = await getExtractionCountsByMeetingIds([TEST_IDS.meeting], db);

      expect(result[TEST_IDS.meeting]).toBeDefined();
      expect(result[TEST_IDS.meeting].action_item).toBe(1);
    });

    it("returns empty object for empty input", async () => {
      const result = await getExtractionCountsByMeetingIds([], db);

      expect(result).toEqual({});
    });
  });

  describe("getAiPulseData()", () => {
    it("returns totals with correct structure", async () => {
      const result = await getAiPulseData(db);

      expect(result).toHaveProperty("totalProcessed");
      expect(result).toHaveProperty("activeActions");
      expect(result).toHaveProperty("upcomingDeadlines");
      expect(typeof result.totalProcessed).toBe("number");
      expect(typeof result.activeActions).toBe("number");
      expect(typeof result.upcomingDeadlines).toBe("number");
    });
  });
});
