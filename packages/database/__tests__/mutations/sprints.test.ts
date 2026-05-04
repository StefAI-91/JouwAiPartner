import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  seedOrganization,
  seedProject,
  seedProfile,
  seedSprint,
  seedTopic,
  TEST_IDS,
} from "../helpers/seed";
import { cleanupTestData, cleanupTestProfile } from "../helpers/cleanup";
import {
  insertSprint,
  updateSprint,
  deleteSprint,
  reorderSprint,
} from "../../src/mutations/sprints";

let db: ReturnType<typeof getTestClient>;
let profileId: string;

describeWithDb("mutations/sprints", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    const profile = await seedProfile({ full_name: "Sprints Mutation User" });
    profileId = profile.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestProfile(profileId);
  });

  afterEach(async () => {
    await db.from("topics").delete().in("id", [TEST_IDS.topic, TEST_IDS.topic2]);
    await db.from("sprints").delete().in("id", [TEST_IDS.sprint, TEST_IDS.sprint2]);
  });

  describe("insertSprint", () => {
    it("zet order_index op 0 als project nog geen sprints heeft", async () => {
      const result = await insertSprint({
        project_id: TEST_IDS.project,
        name: "Sprint 1",
        delivery_week: "2026-05-04",
      });

      if ("error" in result) throw new Error(result.error);
      expect(result.data.order_index).toBe(0);
      expect(result.data.status).toBe("planned");
    });

    it("incrementeert order_index op basis van max+1", async () => {
      await seedSprint({ id: TEST_IDS.sprint, order_index: 4 });

      const result = await insertSprint({
        project_id: TEST_IDS.project,
        name: "Volgende sprint",
        delivery_week: "2026-05-11",
      });

      if ("error" in result) throw new Error(result.error);
      expect(result.data.order_index).toBe(5);
    });

    it("respecteert expliciete order_index uit caller", async () => {
      const result = await insertSprint({
        project_id: TEST_IDS.project,
        name: "Sprint X",
        delivery_week: "2026-05-04",
        order_index: 99,
      });

      if ("error" in result) throw new Error(result.error);
      expect(result.data.order_index).toBe(99);
    });
  });

  describe("updateSprint", () => {
    it("werkt naam, summary en status bij", async () => {
      await seedSprint({ id: TEST_IDS.sprint, name: "Oud" });

      const result = await updateSprint(TEST_IDS.sprint, {
        name: "Nieuw",
        summary: "Login + onboarding",
        status: "in_progress",
      });

      if ("error" in result) throw new Error(result.error);
      expect(result.data.name).toBe("Nieuw");
      expect(result.data.summary).toBe("Login + onboarding");
      expect(result.data.status).toBe("in_progress");
    });
  });

  describe("deleteSprint", () => {
    it("ontkoppelt gekoppelde topics via FK ON DELETE SET NULL", async () => {
      await seedSprint({ id: TEST_IDS.sprint });
      await seedTopic(profileId, {
        id: TEST_IDS.topic,
        target_sprint_id: TEST_IDS.sprint,
      });

      const result = await deleteSprint(TEST_IDS.sprint);
      if ("error" in result) throw new Error(result.error);

      const { data } = await db
        .from("topics")
        .select("target_sprint_id, origin")
        .eq("id", TEST_IDS.topic)
        .single();
      // FK SET NULL → topic blijft, target_sprint_id wordt null. Trigger
      // ziet target_sprint_id wijzigen en zet origin terug naar 'production'.
      expect(data?.target_sprint_id).toBeNull();
      expect(data?.origin).toBe("production");
    });
  });

  describe("reorderSprint", () => {
    it("wisselt order_index met de buur omhoog", async () => {
      await seedSprint({ id: TEST_IDS.sprint, name: "Sprint 1", order_index: 0 });
      await seedSprint({ id: TEST_IDS.sprint2, name: "Sprint 2", order_index: 1 });

      const result = await reorderSprint(TEST_IDS.sprint2, "up");
      if ("error" in result) throw new Error(result.error);

      const { data: rows } = await db
        .from("sprints")
        .select("id, order_index")
        .in("id", [TEST_IDS.sprint, TEST_IDS.sprint2])
        .order("order_index", { ascending: true });
      expect(rows?.[0].id).toBe(TEST_IDS.sprint2);
      expect(rows?.[1].id).toBe(TEST_IDS.sprint);
    });

    it("is no-op als sprint al bovenaan staat (up vanaf order_index=0)", async () => {
      await seedSprint({ id: TEST_IDS.sprint, order_index: 0 });

      const result = await reorderSprint(TEST_IDS.sprint, "up");
      if ("error" in result) throw new Error(result.error);

      const { data } = await db
        .from("sprints")
        .select("order_index")
        .eq("id", TEST_IDS.sprint)
        .single();
      expect(data?.order_index).toBe(0);
    });

    it("retourneert error voor onbekend sprint-id", async () => {
      const result = await reorderSprint("00000000-0000-0000-0000-000000000fff", "up");
      expect("error" in result).toBe(true);
    });
  });
});
