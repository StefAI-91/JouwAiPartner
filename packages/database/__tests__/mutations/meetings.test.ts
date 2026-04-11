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
import { cleanupTestData, cleanupMeetingsByFirefliesPrefix } from "../helpers/cleanup";
import {
  insertMeeting,
  insertManualMeeting,
  updateMeetingTitle,
  updateMeetingClassification,
  linkMeetingProject,
  linkAllMeetingProjects,
  unlinkMeetingProject,
  deleteMeeting,
  markMeetingEmbeddingStale,
} from "../../src/mutations/meetings";

let db: ReturnType<typeof getTestClient>;
const FIREFLIES_PREFIX = "t02-meetings-";

describeWithDb("mutations/meetings", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    await seedPerson();
  });

  afterEach(async () => {
    // Clean up meetings created during tests (keep org/project/person)
    await db.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting);
    await db.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting2);
    await db.from("meeting_projects").delete().eq("meeting_id", TEST_IDS.meeting);
    await db.from("meeting_projects").delete().eq("meeting_id", TEST_IDS.meeting2);
    await db.from("meeting_participants").delete().eq("meeting_id", TEST_IDS.meeting);
    await db.from("meetings").delete().eq("id", TEST_IDS.meeting);
    await db.from("meetings").delete().eq("id", TEST_IDS.meeting2);
    await cleanupMeetingsByFirefliesPrefix(FIREFLIES_PREFIX);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("insertMeeting()", () => {
    it("inserts a meeting and returns { success, id }", async () => {
      const result = await insertMeeting({
        fireflies_id: `${FIREFLIES_PREFIX}insert-1`,
        title: "T02 Insert Meeting",
        date: "2026-01-15T10:00:00Z",
        participants: ["Alice", "Bob"],
        summary: "Test summary",
        transcript: "Test transcript",
        meeting_type: "team_sync",
        party_type: "internal",
        relevance_score: 0.8,
        organization_id: TEST_IDS.organization,
        unmatched_organization_name: null,
        embedding_stale: true,
      });

      expect(result).toHaveProperty("success", true);
      expect((result as { success: true; data: { id: string } }).data.id).toBeDefined();

      // Verify in DB
      const { data: row } = await db
        .from("meetings")
        .select("title, meeting_type, party_type, relevance_score")
        .eq("fireflies_id", `${FIREFLIES_PREFIX}insert-1`)
        .single();

      expect(row?.title).toBe("T02 Insert Meeting");
      expect(row?.meeting_type).toBe("team_sync");
      expect(row?.party_type).toBe("internal");
      expect(row?.relevance_score).toBe(0.8);
    });

    it("ignores duplicate fireflies_id (ignoreDuplicates: true)", async () => {
      // First insert
      await insertMeeting({
        fireflies_id: `${FIREFLIES_PREFIX}dup-ff`,
        title: "Original Title",
        date: "2026-01-15T10:00:00Z",
        participants: [],
        summary: "Original",
        transcript: "",
        meeting_type: "team_sync",
        party_type: "internal",
        relevance_score: 0.5,
        organization_id: null,
        unmatched_organization_name: null,
        embedding_stale: true,
      });

      // Second insert with same fireflies_id — should be ignored
      const result = await insertMeeting({
        fireflies_id: `${FIREFLIES_PREFIX}dup-ff`,
        title: "Different Title",
        date: "2026-01-16T10:00:00Z",
        participants: [],
        summary: "Different",
        transcript: "",
        meeting_type: "client_call",
        party_type: "client",
        relevance_score: 0.9,
        organization_id: null,
        unmatched_organization_name: null,
        embedding_stale: true,
      });

      // With ignoreDuplicates + .single(), this returns an error (no rows returned)
      expect(result).toHaveProperty("error");

      // Original row should be unchanged
      const { data: row } = await db
        .from("meetings")
        .select("title")
        .eq("fireflies_id", `${FIREFLIES_PREFIX}dup-ff`)
        .single();

      expect(row?.title).toBe("Original Title");
    });

    it("returns error on duplicate title+date combination", async () => {
      await insertMeeting({
        fireflies_id: `${FIREFLIES_PREFIX}dup-td-1`,
        title: "Same Title Test",
        date: "2026-02-01T10:00:00Z",
        participants: [],
        summary: "",
        transcript: "",
        meeting_type: "team_sync",
        party_type: "internal",
        relevance_score: 0.5,
        organization_id: null,
        unmatched_organization_name: null,
        embedding_stale: true,
      });

      const result = await insertMeeting({
        fireflies_id: `${FIREFLIES_PREFIX}dup-td-2`,
        title: "Same Title Test",
        date: "2026-02-01T14:00:00Z", // same day, different time
        participants: [],
        summary: "",
        transcript: "",
        meeting_type: "team_sync",
        party_type: "internal",
        relevance_score: 0.5,
        organization_id: null,
        unmatched_organization_name: null,
        embedding_stale: true,
      });

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("duplicate_meeting");
    });
  });

  describe("insertManualMeeting()", () => {
    it("inserts with correct defaults (relevance_score=1.0, embedding_stale=true, draft)", async () => {
      const result = await insertManualMeeting({
        title: "Manual Meeting T02",
        date: "2026-03-01T09:00:00Z",
        summary: "Manual meeting summary",
        meeting_type: "phone_call",
        party_type: "client",
        organization_id: TEST_IDS.organization,
      });

      expect(result).toHaveProperty("success", true);
      const id = (result as { success: true; data: { id: string } }).data.id;

      const { data: row } = await db
        .from("meetings")
        .select("relevance_score, embedding_stale, verification_status, participants")
        .eq("id", id)
        .single();

      expect(row?.relevance_score).toBe(1.0);
      expect(row?.embedding_stale).toBe(true);
      expect(row?.verification_status).toBe("draft");
      expect(row?.participants).toEqual([]);
    });

    it("returns error on duplicate title+date", async () => {
      await insertManualMeeting({
        title: "Duplicate Manual",
        date: "2026-03-05T10:00:00Z",
        summary: "",
        meeting_type: "phone_call",
        party_type: "internal",
        organization_id: null,
      });

      const result = await insertManualMeeting({
        title: "Duplicate Manual",
        date: "2026-03-05T15:00:00Z", // same day
        summary: "",
        meeting_type: "phone_call",
        party_type: "internal",
        organization_id: null,
      });

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("bestaat al een meeting");
    });
  });

  describe("updateMeetingTitle()", () => {
    it("updates the title", async () => {
      const meeting = await seedMeeting({ fireflies_id: `${FIREFLIES_PREFIX}title-update` });

      const result = await updateMeetingTitle(meeting.id, "Updated Title T02");

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db.from("meetings").select("title").eq("id", meeting.id).single();

      expect(row?.title).toBe("Updated Title T02");
    });
  });

  describe("updateMeetingClassification()", () => {
    it("writes meeting_type, party_type, relevance_score", async () => {
      const meeting = await seedMeeting({ fireflies_id: `${FIREFLIES_PREFIX}classify` });

      const result = await updateMeetingClassification(meeting.id, {
        meeting_type: "client_call",
        party_type: "client",
        relevance_score: 0.95,
        organization_id: TEST_IDS.organization,
        unmatched_organization_name: null,
        raw_fireflies: { classified: true },
      });

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("meetings")
        .select("meeting_type, party_type, relevance_score, organization_id")
        .eq("id", meeting.id)
        .single();

      expect(row?.meeting_type).toBe("client_call");
      expect(row?.party_type).toBe("client");
      expect(row?.relevance_score).toBe(0.95);
      expect(row?.organization_id).toBe(TEST_IDS.organization);
    });
  });

  describe("linkMeetingProject()", () => {
    it("links a project to a meeting", async () => {
      const meeting = await seedMeeting({ fireflies_id: `${FIREFLIES_PREFIX}link-proj` });

      const result = await linkMeetingProject(meeting.id, TEST_IDS.project);

      expect(result).toHaveProperty("success", true);

      const { data: link } = await db
        .from("meeting_projects")
        .select("meeting_id, project_id, source")
        .eq("meeting_id", meeting.id)
        .eq("project_id", TEST_IDS.project)
        .single();

      expect(link).toBeDefined();
      expect(link?.source).toBe("ai");
    });

    it("second call with same pair does not error (upsert)", async () => {
      const meeting = await seedMeeting({ fireflies_id: `${FIREFLIES_PREFIX}link-proj-dup` });

      await linkMeetingProject(meeting.id, TEST_IDS.project);
      const result = await linkMeetingProject(meeting.id, TEST_IDS.project, "manual");

      expect(result).toHaveProperty("success", true);
    });
  });

  describe("linkAllMeetingProjects()", () => {
    it("filters null project_ids and links valid ones", async () => {
      const meeting = await seedMeeting({ fireflies_id: `${FIREFLIES_PREFIX}link-all` });

      const result = await linkAllMeetingProjects(meeting.id, [
        { project_id: TEST_IDS.project },
        { project_id: null },
      ]);

      expect(result.linked).toBe(1);
      expect(result.errors).toHaveLength(0);

      const { count } = await db
        .from("meeting_projects")
        .select("*", { count: "exact", head: true })
        .eq("meeting_id", meeting.id);

      expect(count).toBe(1);
    });

    it("returns linked=0 for empty list", async () => {
      const meeting = await seedMeeting({ fireflies_id: `${FIREFLIES_PREFIX}link-empty` });

      const result = await linkAllMeetingProjects(meeting.id, []);

      expect(result.linked).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("unlinkMeetingProject()", () => {
    it("removes a specific project link", async () => {
      const meeting = await seedMeeting({ fireflies_id: `${FIREFLIES_PREFIX}unlink` });
      await linkMeetingProject(meeting.id, TEST_IDS.project);

      const result = await unlinkMeetingProject(meeting.id, TEST_IDS.project);

      expect(result).toHaveProperty("success", true);

      const { count } = await db
        .from("meeting_projects")
        .select("*", { count: "exact", head: true })
        .eq("meeting_id", meeting.id)
        .eq("project_id", TEST_IDS.project);

      expect(count).toBe(0);
    });
  });

  describe("deleteMeeting()", () => {
    it("cascading deletes extractions, meeting_projects, meeting_participants", async () => {
      const meeting = await seedMeeting({
        id: TEST_IDS.meeting,
        fireflies_id: `${FIREFLIES_PREFIX}cascade`,
      });

      // Create related records
      await seedExtraction({ meeting_id: meeting.id });
      await linkMeetingProject(meeting.id, TEST_IDS.project);
      await db.from("meeting_participants").insert({
        meeting_id: meeting.id,
        person_id: TEST_IDS.person,
      });

      const result = await deleteMeeting(meeting.id);

      expect(result).toHaveProperty("success", true);

      // Verify cascade
      const { count: extractionCount } = await db
        .from("extractions")
        .select("*", { count: "exact", head: true })
        .eq("meeting_id", meeting.id);

      const { count: projectCount } = await db
        .from("meeting_projects")
        .select("*", { count: "exact", head: true })
        .eq("meeting_id", meeting.id);

      const { count: participantCount } = await db
        .from("meeting_participants")
        .select("*", { count: "exact", head: true })
        .eq("meeting_id", meeting.id);

      expect(extractionCount).toBe(0);
      expect(projectCount).toBe(0);
      expect(participantCount).toBe(0);
    });
  });

  describe("markMeetingEmbeddingStale()", () => {
    it("sets embedding_stale=true", async () => {
      const meeting = await seedMeeting({
        fireflies_id: `${FIREFLIES_PREFIX}stale`,
        embedding_stale: false,
      });

      const result = await markMeetingEmbeddingStale(meeting.id);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("meetings")
        .select("embedding_stale")
        .eq("id", meeting.id)
        .single();

      expect(row?.embedding_stale).toBe(true);
    });
  });
});
