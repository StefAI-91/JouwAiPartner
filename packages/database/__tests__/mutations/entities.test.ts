import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import { seedOrganization, seedProject, seedPerson, TEST_IDS } from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "../../src/mutations/organizations";
import { createProject, updateProjectAliases, deleteProject } from "../../src/mutations/projects";
import { createPerson, updatePerson, deletePerson } from "../../src/mutations/people";

let db: ReturnType<typeof getTestClient>;

// Use unique IDs for entities created by these tests (not the shared TEST_IDS)
const ENTITY_IDS = {
  org: "00000000-0000-0000-0000-0000000e0001",
  project: "00000000-0000-0000-0000-0000000e0002",
  person: "00000000-0000-0000-0000-0000000e0003",
};

describeWithDb("mutations/organizations", () => {
  beforeAll(async () => {
    db = getTestClient();
    // Clean up any leftover test entities
    await db.from("projects").delete().eq("id", ENTITY_IDS.project);
    await db.from("organizations").delete().eq("id", ENTITY_IDS.org);
  });

  afterEach(async () => {
    await db.from("projects").delete().eq("id", ENTITY_IDS.project);
    await db.from("organizations").delete().eq("id", ENTITY_IDS.org);
    // Also clean up by name for create tests
    await db.from("organizations").delete().like("name", "T02 Org%");
    await db.from("organizations").delete().like("name", "T02 Dup%");
  });

  afterAll(async () => {
    await db.from("organizations").delete().like("name", "T02%");
  });

  describe("createOrganization()", () => {
    it("inserts with defaults (type=client, status=active)", async () => {
      const result = await createOrganization({ name: "T02 Org Test" });

      expect(result).toHaveProperty("success", true);
      const data = (result as { success: true; data: { id: string; name: string } }).data;
      expect(data.name).toBe("T02 Org Test");

      const { data: row } = await db
        .from("organizations")
        .select("type, status")
        .eq("id", data.id)
        .single();

      expect(row?.type).toBe("client");
      expect(row?.status).toBe("active");
    });

    it("duplicate name returns error 23505", async () => {
      await createOrganization({ name: "T02 Dup Org" });
      const result = await createOrganization({ name: "T02 Dup Org" });

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("bestaat al een organisatie");
    });
  });

  describe("updateOrganization()", () => {
    it("partial update", async () => {
      const created = await createOrganization({ name: "T02 Org Update" });
      const orgId = (created as { success: true; data: { id: string } }).data.id;

      const result = await updateOrganization(orgId, { type: "partner" });

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("organizations")
        .select("type, name")
        .eq("id", orgId)
        .single();

      expect(row?.type).toBe("partner");
      expect(row?.name).toBe("T02 Org Update"); // unchanged
    });

    it("duplicate name on update returns error", async () => {
      await createOrganization({ name: "T02 Org Exists" });
      const second = await createOrganization({ name: "T02 Org ToRename" });
      const secondId = (second as { success: true; data: { id: string } }).data.id;

      const result = await updateOrganization(secondId, { name: "T02 Org Exists" });

      expect(result).toHaveProperty("error");
    });
  });

  describe("deleteOrganization()", () => {
    it("hard deletes the organization", async () => {
      const created = await createOrganization({ name: "T02 Org Delete" });
      const orgId = (created as { success: true; data: { id: string } }).data.id;

      const result = await deleteOrganization(orgId);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("organizations")
        .select("id")
        .eq("id", orgId)
        .maybeSingle();

      expect(row).toBeNull();
    });
  });
});

describeWithDb("mutations/projects", () => {
  beforeAll(async () => {
    db = getTestClient();
    // Ensure we have an org for FK references
    await seedOrganization();
  });

  afterEach(async () => {
    await db.from("projects").delete().like("name", "T02 Proj%");
  });

  afterAll(async () => {
    await db.from("projects").delete().like("name", "T02%");
    await cleanupTestData();
  });

  describe("createProject()", () => {
    it("inserts with defaults (status=active)", async () => {
      const result = await createProject({ name: "T02 Proj Test" });

      expect(result).toHaveProperty("success", true);
      const data = (result as { success: true; data: { id: string; name: string } }).data;
      expect(data.name).toBe("T02 Proj Test");

      const { data: row } = await db.from("projects").select("status").eq("id", data.id).single();

      expect(row?.status).toBe("active");
    });

    it("duplicate name returns error 23505", async () => {
      await createProject({ name: "T02 Proj Dup" });
      const result = await createProject({ name: "T02 Proj Dup" });

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("bestaat al een project");
    });
  });

  describe("updateProjectAliases()", () => {
    it("updates aliases array", async () => {
      const created = await createProject({ name: "T02 Proj Aliases" });
      const projId = (created as { success: true; data: { id: string } }).data.id;

      const result = await updateProjectAliases(projId, ["alias-1", "alias-2"]);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db.from("projects").select("aliases").eq("id", projId).single();

      expect(row?.aliases).toEqual(["alias-1", "alias-2"]);
    });
  });

  describe("deleteProject()", () => {
    it("hard deletes the project", async () => {
      const created = await createProject({ name: "T02 Proj Delete" });
      const projId = (created as { success: true; data: { id: string } }).data.id;

      const result = await deleteProject(projId);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db.from("projects").select("id").eq("id", projId).maybeSingle();

      expect(row).toBeNull();
    });
  });
});

describeWithDb("mutations/people", () => {
  beforeAll(async () => {
    db = getTestClient();
    await seedOrganization();
  });

  afterEach(async () => {
    await db.from("people").delete().like("name", "T02 Person%");
  });

  afterAll(async () => {
    await db.from("people").delete().like("name", "T02%");
    await cleanupTestData();
  });

  describe("createPerson()", () => {
    it("inserts and sets embedding_stale=true", async () => {
      const result = await createPerson({
        name: "T02 Person Test",
        email: "t02-person-test@test.local",
      });

      expect(result).toHaveProperty("success", true);
      const data = (result as { success: true; data: { id: string; name: string } }).data;
      expect(data.name).toBe("T02 Person Test");

      const { data: row } = await db
        .from("people")
        .select("embedding_stale")
        .eq("id", data.id)
        .single();

      expect(row?.embedding_stale).toBe(true);
    });

    it("duplicate email returns error 23505", async () => {
      await createPerson({
        name: "T02 Person Dup1",
        email: "t02-dup@test.local",
      });
      const result = await createPerson({
        name: "T02 Person Dup2",
        email: "t02-dup@test.local",
      });

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("bestaat al een persoon");
    });
  });

  describe("updatePerson()", () => {
    it("partial update and marks embedding_stale=true", async () => {
      const created = await createPerson({
        name: "T02 Person Update",
        email: "t02-update@test.local",
      });
      const personId = (created as { success: true; data: { id: string } }).data.id;

      // Set embedding_stale to false first
      await db.from("people").update({ embedding_stale: false }).eq("id", personId);

      const result = await updatePerson(personId, { role: "Lead Developer" });

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db
        .from("people")
        .select("role, name, embedding_stale")
        .eq("id", personId)
        .single();

      expect(row?.role).toBe("Lead Developer");
      expect(row?.name).toBe("T02 Person Update"); // unchanged
      expect(row?.embedding_stale).toBe(true);
    });
  });

  describe("deletePerson()", () => {
    it("hard deletes the person", async () => {
      const created = await createPerson({
        name: "T02 Person Delete",
        email: "t02-delete@test.local",
      });
      const personId = (created as { success: true; data: { id: string } }).data.id;

      const result = await deletePerson(personId);

      expect(result).toHaveProperty("success", true);

      const { data: row } = await db.from("people").select("id").eq("id", personId).maybeSingle();

      expect(row).toBeNull();
    });
  });
});
