import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import { seedOrganization, seedProject, TEST_IDS } from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import { getAllowedDomainsForProject, isOriginAllowedForProject } from "../../src/queries/widget";

let db: ReturnType<typeof getTestClient>;

describeWithDb("queries/widget/access", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
  });

  afterEach(async () => {
    await db.from("widget_allowed_projects").delete().eq("project_id", TEST_IDS.project);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("getAllowedDomainsForProject()", () => {
    it("returns empty array when project has no whitelist rows", async () => {
      const domains = await getAllowedDomainsForProject(TEST_IDS.project, db);
      expect(domains).toEqual([]);
    });

    it("returns whitelisted domains for the project", async () => {
      await db.from("widget_allowed_projects").insert([
        { project_id: TEST_IDS.project, domain: "app.example.com" },
        { project_id: TEST_IDS.project, domain: "staging.example.com" },
      ]);
      const domains = await getAllowedDomainsForProject(TEST_IDS.project, db);
      expect(domains.sort()).toEqual(["app.example.com", "staging.example.com"]);
    });

    it("does not bleed domains from other projects", async () => {
      await db.from("widget_allowed_projects").insert({
        project_id: TEST_IDS.project,
        domain: "mine.example.com",
      });
      const domains = await getAllowedDomainsForProject("00000000-0000-0000-0000-0000000000ff", db);
      expect(domains).toEqual([]);
    });
  });

  describe("isOriginAllowedForProject()", () => {
    beforeAll(async () => {
      await db.from("widget_allowed_projects").insert({
        project_id: TEST_IDS.project,
        domain: "app.example.com",
      });
    });

    it("matches Origin → host on whitelist", async () => {
      const ok = await isOriginAllowedForProject(TEST_IDS.project, "https://app.example.com", db);
      expect(ok).toBe(true);
    });

    it("rejects host not on whitelist", async () => {
      const ok = await isOriginAllowedForProject(TEST_IDS.project, "https://evil.example.com", db);
      expect(ok).toBe(false);
    });

    it("rejects malformed origin string (fail-closed)", async () => {
      const ok = await isOriginAllowedForProject(TEST_IDS.project, "not a url", db);
      expect(ok).toBe(false);
    });

    it("ignores port and path — host-only match", async () => {
      const ok = await isOriginAllowedForProject(
        TEST_IDS.project,
        "https://app.example.com:8080/some/path",
        db,
      );
      expect(ok).toBe(true);
    });
  });
});
