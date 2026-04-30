import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import { cleanupTestData, cleanupTestProfile } from "../helpers/cleanup";
import { seedOrganization, seedProfile, seedProject, seedTopic, TEST_IDS } from "../helpers/seed";
import {
  getProjectBriefingHeader,
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

    const ready = await listTopicsReadyToTest(TEST_IDS.project, db);
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

    const ready = await listTopicsReadyToTest(TEST_IDS.project, db);
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

    const waiting = await listTopicsAwaitingInput(TEST_IDS.project, db);
    expect(waiting).toHaveLength(1);
    expect(waiting[0].id).toBe(TEST_IDS.topic);
  });
});
