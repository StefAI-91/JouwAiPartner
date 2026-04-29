import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import { seedOrganization, seedProject, TEST_IDS } from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import { insertWidgetIssue } from "../../src/mutations/widget";
import type { WidgetIngestInput } from "../../src/validations/widget";

let db: ReturnType<typeof getTestClient>;

const baseInput: WidgetIngestInput = {
  project_id: TEST_IDS.project,
  type: "bug",
  description: "Iets ging mis op het dashboard, de grafiek laadt niet.",
  context: {
    url: "https://cockpit.jouw-ai-partner.nl/dashboard",
    viewport: { width: 1440, height: 900 },
    user_agent: "Mozilla/5.0",
  },
  reporter_email: "tester@jouw-ai-partner.nl",
};

describeWithDb("mutations/widget/insertWidgetIssue", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
  });

  afterEach(async () => {
    await db.from("issues").delete().eq("project_id", TEST_IDS.project);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("inserts an issue with source='jaip_widget' and triage status", async () => {
    const result = await insertWidgetIssue(baseInput, db);
    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.data.source).toBe("jaip_widget");
    expect(result.data.status).toBe("triage");
    expect(result.data.type).toBe("bug");
    expect(result.data.project_id).toBe(TEST_IDS.project);
    expect(result.data.reporter_email).toBe("tester@jouw-ai-partner.nl");
    expect(result.data.source_url).toBe(baseInput.context.url);
  });

  it("maps type='idea' → 'feature_request'", async () => {
    const result = await insertWidgetIssue({ ...baseInput, type: "idea" }, db);
    if ("error" in result) throw new Error(result.error);
    expect(result.data.type).toBe("feature_request");
  });

  it("maps type='question' → 'question'", async () => {
    const result = await insertWidgetIssue({ ...baseInput, type: "question" }, db);
    if ("error" in result) throw new Error(result.error);
    expect(result.data.type).toBe("question");
  });

  it("captures viewport + user_agent in source_metadata", async () => {
    const result = await insertWidgetIssue(baseInput, db);
    if ("error" in result) throw new Error(result.error);
    const meta = result.data.source_metadata as Record<string, unknown>;
    expect(meta.viewport).toEqual({ width: 1440, height: 900 });
    expect(meta.user_agent).toBe("Mozilla/5.0");
    expect(meta.submitted_at).toBeDefined();
  });

  it("labels test-pattern submissions with 'test'", async () => {
    const result = await insertWidgetIssue({ ...baseInput, description: "dit is een test" }, db);
    if ("error" in result) throw new Error(result.error);
    expect(result.data.labels).toContain("test");
  });

  it("does not label normal feedback as test", async () => {
    const result = await insertWidgetIssue(baseInput, db);
    if ("error" in result) throw new Error(result.error);
    expect(result.data.labels ?? []).not.toContain("test");
  });

  it("uses first line as title and trims to 200 chars", async () => {
    const longLine = "x".repeat(300);
    const result = await insertWidgetIssue(
      { ...baseInput, description: `${longLine}\nrest of body` },
      db,
    );
    if ("error" in result) throw new Error(result.error);
    expect(result.data.title.length).toBeLessThanOrEqual(200);
  });

  it("stores reporter_email as null when omitted", async () => {
    const result = await insertWidgetIssue({ ...baseInput, reporter_email: null }, db);
    if ("error" in result) throw new Error(result.error);
    expect(result.data.reporter_email).toBeNull();
  });
});
