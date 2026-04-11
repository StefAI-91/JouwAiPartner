import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  seedOrganization,
  seedProject,
  seedMeeting,
  seedExtraction,
  seedProfile,
  TEST_IDS,
} from "../helpers/seed";
import { cleanupTestData, cleanupTestProfile } from "../helpers/cleanup";
import { verifyMeeting, verifyMeetingWithEdits, rejectMeeting } from "../../src/mutations/review";

let db: ReturnType<typeof getTestClient>;

describeWithDb("mutations/review", () => {
  let profileId: string;

  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();

    const profile = await seedProfile({ email: "t02-review-test@test.local" });
    profileId = profile.id;
  });

  afterEach(async () => {
    // Clean up meetings and extractions
    await db.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting);
    await db.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting2);
    await db.from("meetings").delete().eq("id", TEST_IDS.meeting);
    await db.from("meetings").delete().eq("id", TEST_IDS.meeting2);
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestProfile(profileId);
  });

  describe("verifyMeeting()", () => {
    it("sets meeting status to verified and all extractions to verified", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        fireflies_id: "t02-review-verify",
        verification_status: "draft",
      });
      await seedExtraction({
        id: TEST_IDS.extraction,
        meeting_id: TEST_IDS.meeting,
        verification_status: "draft",
      });

      const result = await verifyMeeting(TEST_IDS.meeting, profileId, db);

      expect(result).toHaveProperty("success", true);

      // Check meeting status
      const { data: meeting } = await db
        .from("meetings")
        .select("verification_status, verified_by, verified_at")
        .eq("id", TEST_IDS.meeting)
        .single();

      expect(meeting?.verification_status).toBe("verified");
      expect(meeting?.verified_at).toBeDefined();

      // Check extraction status
      const { data: extraction } = await db
        .from("extractions")
        .select("verification_status")
        .eq("id", TEST_IDS.extraction)
        .single();

      expect(extraction?.verification_status).toBe("verified");
    });
  });

  describe("verifyMeetingWithEdits()", () => {
    it("applies edits, rejects specified extraction IDs, applies type changes", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        fireflies_id: "t02-review-with-edits",
        verification_status: "draft",
      });

      // Create two extractions
      const { data: ext1 } = await db
        .from("extractions")
        .insert({
          meeting_id: TEST_IDS.meeting,
          type: "action_item",
          content: "Original content 1",
          confidence: 0.9,
          verification_status: "draft",
        })
        .select("id")
        .single();

      const { data: ext2 } = await db
        .from("extractions")
        .insert({
          meeting_id: TEST_IDS.meeting,
          type: "action_item",
          content: "Original content 2",
          confidence: 0.8,
          verification_status: "draft",
        })
        .select("id")
        .single();

      const result = await verifyMeetingWithEdits(
        TEST_IDS.meeting,
        profileId,
        [{ extractionId: ext1!.id, content: "Edited content 1" }], // edits
        [ext2!.id], // rejectedIds
        [{ extractionId: ext1!.id, type: "decision" }], // typeChanges
        db,
      );

      expect(result).toHaveProperty("success", true);

      // Check meeting is verified
      const { data: meeting } = await db
        .from("meetings")
        .select("verification_status")
        .eq("id", TEST_IDS.meeting)
        .single();

      expect(meeting?.verification_status).toBe("verified");

      // Check ext1 was edited and type changed
      const { data: editedExt } = await db
        .from("extractions")
        .select("content, type, verification_status")
        .eq("id", ext1!.id)
        .single();

      expect(editedExt?.content).toBe("Edited content 1");
      expect(editedExt?.type).toBe("decision");
      expect(editedExt?.verification_status).toBe("verified");

      // Check ext2 was rejected
      const { data: rejectedExt } = await db
        .from("extractions")
        .select("verification_status")
        .eq("id", ext2!.id)
        .single();

      expect(rejectedExt?.verification_status).toBe("rejected");
    });
  });

  describe("rejectMeeting()", () => {
    it("sets meeting status to rejected", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        fireflies_id: "t02-review-reject",
        verification_status: "draft",
      });

      const result = await rejectMeeting(TEST_IDS.meeting, profileId, db);

      expect(result).toHaveProperty("success", true);

      const { data: meeting } = await db
        .from("meetings")
        .select("verification_status")
        .eq("id", TEST_IDS.meeting)
        .single();

      expect(meeting?.verification_status).toBe("rejected");
    });
  });
});
