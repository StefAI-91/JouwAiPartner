import { describe, it, expect } from "vitest";
import {
  createTopicSchema,
  updateTopicSchema,
  topicStatusSchema,
  linkIssueSchema,
} from "../../src/validations/topics";

// PR-002 (PR-REQ-021) — Zod-schemas zijn de eerste gate vóór een payload de
// mutations bereikt. Deze tests pinnen de gedragsregels die de Server Action
// in PR-003/PR-004 zal vertrouwen: title-length, type-enum, omit van immutable
// velden, refine voor lege updates, en de wont_do_reason-soft-rule.

describe("createTopicSchema", () => {
  it("accepteert een minimale valide topic-payload", () => {
    const ok = createTopicSchema.parse({
      project_id: "11111111-1111-4111-8111-111111111111",
      title: "Knop X werkt niet",
      type: "bug",
    });
    expect(ok.title).toBe("Knop X werkt niet");
  });

  it("weigert een title onder 3 tekens", () => {
    const result = createTopicSchema.safeParse({
      project_id: "11111111-1111-4111-8111-111111111111",
      title: "no",
      type: "bug",
    });
    expect(result.success).toBe(false);
  });

  it("weigert een onbekend type", () => {
    const result = createTopicSchema.safeParse({
      project_id: "11111111-1111-4111-8111-111111111111",
      title: "Test",
      type: "improvement",
    });
    expect(result.success).toBe(false);
  });

  it("weigert een niet-uuid project_id", () => {
    const result = createTopicSchema.safeParse({
      project_id: "not-a-uuid",
      title: "Test topic",
      type: "feature",
    });
    expect(result.success).toBe(false);
  });

  it("accepteert priority alleen uit de P0-P3 set", () => {
    const ok = createTopicSchema.safeParse({
      project_id: "11111111-1111-4111-8111-111111111111",
      title: "Test",
      type: "bug",
      priority: "P1",
    });
    expect(ok.success).toBe(true);
    const fail = createTopicSchema.safeParse({
      project_id: "11111111-1111-4111-8111-111111111111",
      title: "Test",
      type: "bug",
      priority: "high",
    });
    expect(fail.success).toBe(false);
  });
});

describe("updateTopicSchema", () => {
  it("staat partial updates toe", () => {
    const result = updateTopicSchema.parse({ title: "Nieuwe titel" });
    expect(result.title).toBe("Nieuwe titel");
  });

  it("weigert een lege payload (niets te updaten)", () => {
    const result = updateTopicSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("staat status_overridden toe als boolean", () => {
    const ok = updateTopicSchema.safeParse({ status_overridden: true });
    expect(ok.success).toBe(true);
  });

  it("kan project_id niet updaten (bewust geomit)", () => {
    const result = updateTopicSchema.safeParse({
      project_id: "11111111-1111-4111-8111-111111111111",
    });
    // refine valt over een lege payload (project_id is gestript), dus dit faalt
    expect(result.success).toBe(false);
  });
});

describe("topicStatusSchema", () => {
  it("accepteert een legale lifecycle-status", () => {
    const ok = topicStatusSchema.parse({ status: "in_progress" });
    expect(ok.status).toBe("in_progress");
  });

  it("weigert een onbekende status", () => {
    const result = topicStatusSchema.safeParse({ status: "blocked" });
    expect(result.success).toBe(false);
  });

  it("staat een lege wont_do_reason toe in fase 1 (soft rule)", () => {
    const ok = topicStatusSchema.safeParse({ status: "wont_do" });
    expect(ok.success).toBe(true);
    const explicitNull = topicStatusSchema.safeParse({
      status: "wont_do",
      wont_do_reason: null,
    });
    expect(explicitNull.success).toBe(true);
  });

  it("weigert een wont_do_reason korter dan 10 chars als hij wél meegegeven wordt", () => {
    const result = topicStatusSchema.safeParse({
      status: "wont_do",
      wont_do_reason: "te kort",
    });
    expect(result.success).toBe(false);
  });

  it("accepteert wont_do met een fatsoenlijke reden (≥10 chars)", () => {
    const ok = topicStatusSchema.safeParse({
      status: "wont_do_proposed_by_client",
      wont_do_reason: "Klant heeft besloten de feature niet door te zetten.",
    });
    expect(ok.success).toBe(true);
  });
});

describe("linkIssueSchema", () => {
  it("accepteert twee uuids", () => {
    const ok = linkIssueSchema.parse({
      topic_id: "11111111-1111-4111-8111-111111111111",
      issue_id: "22222222-2222-4222-8222-222222222222",
    });
    expect(ok.topic_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("weigert een ontbrekend veld", () => {
    const result = linkIssueSchema.safeParse({
      topic_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(false);
  });
});
