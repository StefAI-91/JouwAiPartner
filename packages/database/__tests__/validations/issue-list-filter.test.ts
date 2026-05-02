import { describe, it, expect } from "vitest";
import { issueListFilterSchema } from "../../src/validations/issues";
import { UNASSIGNED_SENTINEL } from "../../src/constants/issues";

// These tests lock down the UUID / enum validation added for Blocker 1
// (PostgREST filter injection). If someone removes the csvListSchema
// sanitization, these tests fail loudly — so the defence-in-depth in
// listIssues never stands alone.

describe("issueListFilterSchema", () => {
  it("drops empty segments from CSV params", () => {
    const parsed = issueListFilterSchema.parse({ status: "triage,,backlog" });
    expect(parsed.status).toEqual(["triage", "backlog"]);
  });

  it("trims whitespace around segments", () => {
    const parsed = issueListFilterSchema.parse({ status: " triage , backlog " });
    expect(parsed.status).toEqual(["triage", "backlog"]);
  });

  it("silently drops invalid enum values instead of widening the result set", () => {
    const parsed = issueListFilterSchema.parse({ status: "triage,not-a-status,backlog" });
    expect(parsed.status).toEqual(["triage", "backlog"]);
  });

  it("returns undefined when every value is garbage (no wildcard fall-through)", () => {
    const parsed = issueListFilterSchema.parse({ status: "garbage,,other-garbage" });
    expect(parsed.status).toBeUndefined();
  });

  it("returns undefined when the param is absent", () => {
    const parsed = issueListFilterSchema.parse({});
    expect(parsed.status).toBeUndefined();
    expect(parsed.priority).toBeUndefined();
    expect(parsed.assignee).toBeUndefined();
  });

  it("accepts the unassigned sentinel in assignee", () => {
    const parsed = issueListFilterSchema.parse({ assignee: UNASSIGNED_SENTINEL });
    expect(parsed.assignee).toEqual([UNASSIGNED_SENTINEL]);
  });

  it("accepts valid uuids in assignee", () => {
    const uuid = "11111111-1111-4111-9111-111111111111";
    const parsed = issueListFilterSchema.parse({ assignee: uuid });
    expect(parsed.assignee).toEqual([uuid]);
  });

  it("accepts a mix of sentinel and uuids", () => {
    const uuid = "11111111-1111-4111-9111-111111111111";
    const parsed = issueListFilterSchema.parse({ assignee: `${UNASSIGNED_SENTINEL},${uuid}` });
    expect(parsed.assignee).toEqual([UNASSIGNED_SENTINEL, uuid]);
  });

  it("rejects a crafted injection payload posing as assignee", () => {
    // The exact shape the quality review flagged: trying to break out of the
    // quoted in-list and inject an extra filter. Must be dropped completely,
    // not passed through.
    const injection = `11111111-1111-4111-9111-111111111111"),status.eq.done`;
    const parsed = issueListFilterSchema.parse({ assignee: injection });
    expect(parsed.assignee).toBeUndefined();
  });

  it("accepts geldige source-groepen (CC-003)", () => {
    const parsed = issueListFilterSchema.parse({ source: "client_pm,end_user" });
    expect(parsed.source).toEqual(["client_pm", "end_user"]);
  });

  it("dropt onbekende source-groepen (CC-003)", () => {
    const parsed = issueListFilterSchema.parse({ source: "client_pm,jaip,bogus" });
    expect(parsed.source).toEqual(["client_pm"]);
  });

  it("validates each enum independently", () => {
    const parsed = issueListFilterSchema.parse({
      status: "triage",
      priority: "not-a-priority",
      type: "bug",
      component: "frontend",
    });
    expect(parsed.status).toEqual(["triage"]);
    expect(parsed.priority).toBeUndefined();
    expect(parsed.type).toEqual(["bug"]);
    expect(parsed.component).toEqual(["frontend"]);
  });
});
