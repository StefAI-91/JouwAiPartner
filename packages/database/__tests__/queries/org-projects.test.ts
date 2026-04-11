import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import { seedOrganization, seedProject, seedMeeting, TEST_IDS } from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import { listOrganizations, getOrganizationById } from "../../src/queries/organizations";
import {
  listProjects,
  getProjectById,
  getActiveProjectsForContext,
} from "../../src/queries/projects";

let db: ReturnType<typeof getTestClient>;

describeWithDb("queries/organizations+projects", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
  });

  afterEach(async () => {
    await db.from("meeting_projects").delete().eq("meeting_id", TEST_IDS.meeting);
    await db.from("meetings").delete().eq("id", TEST_IDS.meeting);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  // ── Organizations ──

  describe("listOrganizations()", () => {
    it("returns organizations with project_count and last_meeting_date", async () => {
      const result = await listOrganizations(db);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const org = result.find((o) => o.id === TEST_IDS.organization);
      expect(org).toBeDefined();
      expect(org!.name).toBe("Test Organization");
      expect(org!.type).toBe("client");
      expect(typeof org!.project_count).toBe("number");
      expect(org!.project_count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getOrganizationById()", () => {
    it("returns organization detail with projects and meetings", async () => {
      await seedMeeting({
        id: TEST_IDS.meeting,
        organization_id: TEST_IDS.organization,
        verification_status: "verified",
      });

      const result = await getOrganizationById(TEST_IDS.organization, db);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEST_IDS.organization);
      expect(result!.name).toBe("Test Organization");
      expect(result!.projects.length).toBeGreaterThanOrEqual(1);
      expect(result!.meetings.length).toBeGreaterThanOrEqual(1);
    });

    it("returns null for non-existent organization", async () => {
      const result = await getOrganizationById("00000000-0000-0000-0000-ffffffffffff", db);

      expect(result).toBeNull();
    });
  });

  // ── Projects ──

  describe("listProjects()", () => {
    it("returns projects with organization join", async () => {
      const result = await listProjects(db);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const project = result.find((p) => p.id === TEST_IDS.project);
      expect(project).toBeDefined();
      expect(project!.name).toBe("Test Project");
      expect(project!.organization).not.toBeNull();
      expect(project!.organization!.name).toBe("Test Organization");
    });
  });

  describe("getProjectById()", () => {
    it("returns project detail with meetings, extractions, summaries", async () => {
      const result = await getProjectById(TEST_IDS.project, db);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEST_IDS.project);
      expect(result!.name).toBe("Test Project");
      expect(result!.organization).not.toBeNull();
      expect(Array.isArray(result!.meetings)).toBe(true);
      expect(Array.isArray(result!.extractions)).toBe(true);
    });

    it("returns null for non-existent project", async () => {
      const result = await getProjectById("00000000-0000-0000-0000-ffffffffffff", db);

      expect(result).toBeNull();
    });
  });

  describe("getActiveProjectsForContext()", () => {
    it("returns projects with aliases and org_name", async () => {
      const result = await getActiveProjectsForContext();

      expect(result.length).toBeGreaterThanOrEqual(1);
      const project = result.find((p) => p.id === TEST_IDS.project);
      expect(project).toBeDefined();
      expect(project!.name).toBe("Test Project");
      expect(Array.isArray(project!.aliases)).toBe(true);
      expect(project!.organization_name).toBe("Test Organization");
    });
  });
});
