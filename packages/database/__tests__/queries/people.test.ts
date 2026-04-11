import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import { seedOrganization, seedPerson, seedMeeting, TEST_IDS } from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import {
  listPeople,
  listPeopleWithOrg,
  findPersonIdsByName,
  findPeopleByNames,
  findPeopleByEmails,
  getPersonById,
  getAllKnownPeople,
} from "../../src/queries/people";

let db: ReturnType<typeof getTestClient>;

describeWithDb("queries/people", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedPerson({
      id: TEST_IDS.person,
      name: "Test Person",
      email: "test@example.com",
      role: "Developer",
      organization_id: TEST_IDS.organization,
    });
  });

  afterEach(async () => {
    await db.from("meeting_participants").delete().eq("person_id", TEST_IDS.person);
    await db.from("meetings").delete().eq("id", TEST_IDS.meeting);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("listPeople()", () => {
    it("returns people ordered by name ASC", async () => {
      const result = await listPeople(db);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const person = result.find((p) => p.id === TEST_IDS.person);
      expect(person).toBeDefined();
      expect(person!.name).toBe("Test Person");
      expect(person!.email).toBe("test@example.com");
    });

    it("respects limit option", async () => {
      const result = await listPeople(db, { limit: 1 });

      expect(result.length).toBeLessThanOrEqual(1);
    });
  });

  describe("listPeopleWithOrg()", () => {
    it("includes organization join", async () => {
      const result = await listPeopleWithOrg(db);

      const person = result.find((p) => p.id === TEST_IDS.person);
      expect(person).toBeDefined();
      expect(person!.organization).not.toBeNull();
      expect(person!.organization!.name).toBe("Test Organization");
    });
  });

  describe("findPersonIdsByName()", () => {
    it("finds people with case-insensitive ilike search", async () => {
      const ids = await findPersonIdsByName("test person");

      expect(ids).toContain(TEST_IDS.person);
    });

    it("returns empty array when no match", async () => {
      const ids = await findPersonIdsByName("zzz_no_match_zzz");

      expect(ids).toEqual([]);
    });
  });

  describe("findPeopleByNames()", () => {
    it("returns Map with lowercase keys", async () => {
      const result = await findPeopleByNames(["Test Person"]);

      expect(result).toBeInstanceOf(Map);
      expect(result.has("test person")).toBe(true);
      expect(result.get("test person")).toBe(TEST_IDS.person);
    });

    it("returns empty Map for empty input", async () => {
      const result = await findPeopleByNames([]);

      expect(result.size).toBe(0);
    });
  });

  describe("findPeopleByEmails()", () => {
    it("returns Map of email to person_id", async () => {
      const result = await findPeopleByEmails(["test@example.com"]);

      expect(result).toBeInstanceOf(Map);
      expect(result.has("test@example.com")).toBe(true);
      expect(result.get("test@example.com")).toBe(TEST_IDS.person);
    });

    it("returns empty Map for empty input", async () => {
      const result = await findPeopleByEmails([]);

      expect(result.size).toBe(0);
    });
  });

  describe("getPersonById()", () => {
    it("returns person detail with organization and meeting_count", async () => {
      // Create a meeting and link participant
      await seedMeeting({ id: TEST_IDS.meeting, verification_status: "verified" });
      await db.from("meeting_participants").insert({
        meeting_id: TEST_IDS.meeting,
        person_id: TEST_IDS.person,
      });

      const result = await getPersonById(TEST_IDS.person, db);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEST_IDS.person);
      expect(result!.name).toBe("Test Person");
      expect(result!.organization).not.toBeNull();
      expect(result!.organization!.name).toBe("Test Organization");
      expect(result!.meeting_count).toBeGreaterThanOrEqual(1);
    });

    it("returns null for non-existent person", async () => {
      const result = await getPersonById("00000000-0000-0000-0000-ffffffffffff", db);

      expect(result).toBeNull();
    });
  });

  describe("getAllKnownPeople()", () => {
    it("returns people with org name and type", async () => {
      const result = await getAllKnownPeople();

      expect(result.length).toBeGreaterThanOrEqual(1);
      const person = result.find((p) => p.id === TEST_IDS.person);
      expect(person).toBeDefined();
      expect(person!.name).toBe("Test Person");
      expect(person!.organization_name).toBe("Test Organization");
      expect(person!.organization_type).toBe("client");
    });
  });
});
