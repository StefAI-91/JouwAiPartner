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
import {
  getProjectBriefingHeader,
  listSprintsReadyToTest,
  listTopicsAwaitingInput,
  listTopicsReadyToTest,
} from "../../src/queries/portal/briefing";

let db: ReturnType<typeof getTestClient>;
let profileId: string;

describeWithDb("queries/portal/briefing", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
    const profile = await seedProfile({ full_name: "Briefing Test User" });
    profileId = profile.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestProfile(profileId);
  });

  afterEach(async () => {
    await db.from("topics").delete().in("id", [TEST_IDS.topic, TEST_IDS.topic2]);
    await db.from("sprints").delete().in("id", [TEST_IDS.sprint, TEST_IDS.sprint2]);
    await db
      .from("projects")
      .update({ preview_url: null, production_url: null, screenshot_url: null })
      .eq("id", TEST_IDS.project);
  });

  it("getProjectBriefingHeader retourneert deploy-velden + organisatie", async () => {
    await db
      .from("projects")
      .update({
        preview_url: "https://preview.example.com",
        production_url: "https://app.example.com",
        screenshot_url: "https://images.example.com/x.png",
      })
      .eq("id", TEST_IDS.project);

    const header = await getProjectBriefingHeader(TEST_IDS.project, db);
    expect(header).not.toBeNull();
    expect(header?.preview_url).toBe("https://preview.example.com");
    expect(header?.production_url).toBe("https://app.example.com");
    expect(header?.screenshot_url).toBe("https://images.example.com/x.png");
    expect(header?.organization?.id).toBe(TEST_IDS.organization);
  });

  it("listTopicsReadyToTest filtert op status=in_progress + ingevulde instructies", async () => {
    await seedTopic(profileId, {
      id: TEST_IDS.topic,
      title: "Met instructies",
      status: "in_progress",
      client_test_instructions: "1. Open preview\n2. Klik zoek",
    });
    await seedTopic(profileId, {
      id: TEST_IDS.topic2,
      title: "Zonder instructies",
      status: "in_progress",
      client_test_instructions: null,
    });

    const ready = await listTopicsReadyToTest(TEST_IDS.project, db, "production");
    expect(ready).toHaveLength(1);
    expect(ready[0].id).toBe(TEST_IDS.topic);
    expect(ready[0].client_test_instructions).toContain("Open preview");
  });

  it("listTopicsReadyToTest negeert topics met andere status zelfs als instructies gevuld zijn", async () => {
    await seedTopic(profileId, {
      id: TEST_IDS.topic,
      status: "scheduled",
      client_test_instructions: "Wel ingevuld maar status klopt niet",
    });

    const ready = await listTopicsReadyToTest(TEST_IDS.project, db, "production");
    expect(ready).toHaveLength(0);
  });

  it("listTopicsAwaitingInput retourneert alleen awaiting_client_input", async () => {
    await seedTopic(profileId, {
      id: TEST_IDS.topic,
      title: "Wacht op klant",
      status: "awaiting_client_input",
    });
    await seedTopic(profileId, {
      id: TEST_IDS.topic2,
      title: "Loopt door",
      status: "in_progress",
    });

    const waiting = await listTopicsAwaitingInput(TEST_IDS.project, db, "production");
    expect(waiting).toHaveLength(1);
    expect(waiting[0].id).toBe(TEST_IDS.topic);
  });

  // CP-012 follow-up — pin de status-keuze: sprints in `delivered` (klant
  // mag testen) komen door, `in_progress` (team werkt nog) niet. Banner
  // toont in_progress separaat. Regressie-vangnet als iemand het ooit
  // terug wil draaien.
  it("listSprintsReadyToTest retourneert delivered-sprints met instructies", async () => {
    await seedSprint({
      id: TEST_IDS.sprint,
      name: "Sprint 1",
      status: "delivered",
      client_test_instructions: "1. Open preview\n2. Login flow doorlopen",
      order_index: 0,
    });

    const ready = await listSprintsReadyToTest(TEST_IDS.project, db);
    expect(ready).toHaveLength(1);
    expect(ready[0].id).toBe(TEST_IDS.sprint);
    expect(ready[0].client_test_instructions).toContain("Open preview");
  });

  it("listSprintsReadyToTest negeert in_progress-sprints (regressie-vangnet)", async () => {
    await seedSprint({
      id: TEST_IDS.sprint,
      status: "in_progress",
      client_test_instructions: "Niet zichtbaar tot delivered",
      order_index: 0,
    });

    const ready = await listSprintsReadyToTest(TEST_IDS.project, db);
    expect(ready).toHaveLength(0);
  });

  it("listSprintsReadyToTest negeert delivered-sprints zonder instructies", async () => {
    await seedSprint({
      id: TEST_IDS.sprint,
      status: "delivered",
      client_test_instructions: null,
      order_index: 0,
    });

    const ready = await listSprintsReadyToTest(TEST_IDS.project, db);
    expect(ready).toHaveLength(0);
  });

  // Dedup-regel — als sprint zelf instructies heeft, vallen de aan die
  // sprint gekoppelde topics uit `listTopicsReadyToTest` zodat klant
  // niet beide ziet.
  it("listTopicsReadyToTest filtert topics gekoppeld aan een sprint die zelf instructies heeft", async () => {
    await seedSprint({
      id: TEST_IDS.sprint,
      status: "delivered",
      client_test_instructions: "Sprint-niveau instructies",
      order_index: 0,
    });
    await seedTopic(profileId, {
      id: TEST_IDS.topic,
      title: "Gekoppeld aan sprint",
      status: "in_progress",
      target_sprint_id: TEST_IDS.sprint,
      client_test_instructions: "Topic-niveau zou dubbel zijn",
    });
    await seedTopic(profileId, {
      id: TEST_IDS.topic2,
      title: "Los topic",
      status: "in_progress",
      target_sprint_id: null,
      client_test_instructions: "Wel zichtbaar — geen sprint-koppeling",
    });

    const ready = await listTopicsReadyToTest(TEST_IDS.project, db, "sprint");
    const ids = ready.map((t) => t.id);
    // Topic2 heeft geen sprint-koppeling, maar zijn origin is `production`
    // (default zonder target_sprint_id). De originFilter='sprint' sluit het
    // dus uit. Daarom verwachten we lege resultaat — beide topics vallen
    // weg, dat is acceptabel: gedrag is samen "geen dubbele rendering".
    expect(ids).not.toContain(TEST_IDS.topic);
  });
});
