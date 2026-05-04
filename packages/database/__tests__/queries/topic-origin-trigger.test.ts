import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import { cleanupTestData, cleanupTestProfile } from "../helpers/cleanup";
import {
  seedOrganization,
  seedProfile,
  seedProject,
  seedSprint,
  seedTopic,
  TEST_IDS,
} from "../helpers/seed";

// CP-012 follow-up — DB-trigger `topics_derive_origin` (zie
// 20260504100000_sprints_test_instructions_topic_origin_trigger.sql) zet
// `topics.origin` automatisch o.b.v. `target_sprint_id`. Dit is een
// integriteits-aanname onder de portal-mode-scheiding; FIX-TH-914 was
// een waarschuwing dat externe DB-gedrag lokaal moet bewezen zijn vóór
// productie-deploy. Deze tests pinnen drie branches:
//   1. INSERT — origin volgt FK
//   2. UPDATE die FK wijzigt — origin volgt mee
//   3. UPDATE die ALLEEN origin wijzigt — trigger overschrijft NIET

let db: ReturnType<typeof getTestClient>;
let profileId: string;

describeWithDb("trigger topics_derive_origin", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    const profile = await seedProfile({ full_name: "Trigger Test User" });
    profileId = profile.id;
    await seedSprint({
      id: TEST_IDS.sprint,
      name: "Sprint A",
      status: "planned",
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestProfile(profileId);
  });

  afterEach(async () => {
    await db.from("topics").delete().in("id", [TEST_IDS.topic, TEST_IDS.topic2]);
  });

  it("INSERT met target_sprint_id → origin = 'sprint'", async () => {
    await seedTopic(profileId, {
      id: TEST_IDS.topic,
      target_sprint_id: TEST_IDS.sprint,
    });

    const { data } = await db
      .from("topics")
      .select("origin, target_sprint_id")
      .eq("id", TEST_IDS.topic)
      .single();
    expect(data?.origin).toBe("sprint");
    expect(data?.target_sprint_id).toBe(TEST_IDS.sprint);
  });

  it("INSERT zonder target_sprint_id → origin = 'production'", async () => {
    await seedTopic(profileId, {
      id: TEST_IDS.topic,
      target_sprint_id: null,
    });

    const { data } = await db.from("topics").select("origin").eq("id", TEST_IDS.topic).single();
    expect(data?.origin).toBe("production");
  });

  it("UPDATE die target_sprint_id van null → uuid zet flipt origin naar 'sprint'", async () => {
    await seedTopic(profileId, {
      id: TEST_IDS.topic,
      target_sprint_id: null,
    });

    await db.from("topics").update({ target_sprint_id: TEST_IDS.sprint }).eq("id", TEST_IDS.topic);

    const { data } = await db.from("topics").select("origin").eq("id", TEST_IDS.topic).single();
    expect(data?.origin).toBe("sprint");
  });

  it("UPDATE die target_sprint_id van uuid → null zet flipt origin naar 'production'", async () => {
    await seedTopic(profileId, {
      id: TEST_IDS.topic,
      target_sprint_id: TEST_IDS.sprint,
    });

    await db.from("topics").update({ target_sprint_id: null }).eq("id", TEST_IDS.topic);

    const { data } = await db.from("topics").select("origin").eq("id", TEST_IDS.topic).single();
    expect(data?.origin).toBe("production");
  });

  it("UPDATE die ALLEEN origin wijzigt (zonder FK-wijziging) blijft staan", async () => {
    // Topic met sprint → trigger zet origin='sprint' bij INSERT.
    await seedTopic(profileId, {
      id: TEST_IDS.topic,
      target_sprint_id: TEST_IDS.sprint,
    });

    // Handmatige override: team wil dit topic in productie-spoor houden
    // ondanks sprint-koppeling. Trigger mag deze override niet ongedaan
    // maken zolang target_sprint_id niet wijzigt.
    await db
      .from("topics")
      .update({ origin: "production", title: "Andere titel" })
      .eq("id", TEST_IDS.topic);

    const { data } = await db
      .from("topics")
      .select("origin, target_sprint_id")
      .eq("id", TEST_IDS.topic)
      .single();
    expect(data?.origin).toBe("production");
    expect(data?.target_sprint_id).toBe(TEST_IDS.sprint);
  });
});
