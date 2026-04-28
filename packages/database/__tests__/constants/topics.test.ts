import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PORTAL_BUCKETS,
  TOPIC_LIFECYCLE_STATUSES,
  TOPIC_TYPES,
  topicStatusToBucket,
} from "../../src/constants/topics";

// PR-001 (PR-DATA-009) — bewaakt de status→bucket-mapping die door zowel
// Portal-roadmap (PR-004) als DevHub-board (PR-003) gebruikt zal worden.
// De 14-dagen-window voor recent_done is hier de single source of truth;
// de tests pinnen die zodat een verschuiving niet stilletjes door de bucket
// drift in productie. Voor deterministische window-tests gebruiken we
// vi.useFakeTimers en setSystemTime.

describe("TOPIC_LIFECYCLE_STATUSES", () => {
  it("dekt exact de 8 lifecycle-states uit prd-portal-roadmap §11.7", () => {
    expect(TOPIC_LIFECYCLE_STATUSES).toEqual([
      "clustering",
      "awaiting_client_input",
      "prioritized",
      "scheduled",
      "in_progress",
      "done",
      "wont_do",
      "wont_do_proposed_by_client",
    ]);
  });
});

describe("TOPIC_TYPES", () => {
  it("kent alleen bug en feature in v1", () => {
    expect(TOPIC_TYPES).toEqual(["bug", "feature"]);
  });
});

describe("PORTAL_BUCKETS", () => {
  it("definieert de vier portal-buckets in vaste volgorde", () => {
    const keys = PORTAL_BUCKETS.map((b) => b.key);
    expect(keys).toEqual(["recent_done", "upcoming", "high_prio", "awaiting_input"]);
  });
});

describe("topicStatusToBucket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mapt scheduled en in_progress naar upcoming", () => {
    expect(topicStatusToBucket("scheduled", null)).toBe("upcoming");
    expect(topicStatusToBucket("in_progress", null)).toBe("upcoming");
  });

  it("mapt prioritized naar high_prio", () => {
    expect(topicStatusToBucket("prioritized", null)).toBe("high_prio");
  });

  it("mapt awaiting_client_input naar awaiting_input", () => {
    expect(topicStatusToBucket("awaiting_client_input", null)).toBe("awaiting_input");
  });

  it("plaatst done binnen 14 dagen in recent_done", () => {
    const tenDaysAgo = new Date("2026-04-18T12:00:00.000Z").toISOString();
    expect(topicStatusToBucket("done", tenDaysAgo)).toBe("recent_done");
  });

  it("verbergt done ouder dan 14 dagen", () => {
    const twentyDaysAgo = new Date("2026-04-08T12:00:00.000Z").toISOString();
    expect(topicStatusToBucket("done", twentyDaysAgo)).toBeNull();
  });

  it("retourneert null voor done zonder closed_at", () => {
    expect(topicStatusToBucket("done", null)).toBeNull();
  });

  it("verbergt clustering en wont_do-statuses voor klanten", () => {
    expect(topicStatusToBucket("clustering", null)).toBeNull();
    expect(topicStatusToBucket("wont_do", null)).toBeNull();
    expect(topicStatusToBucket("wont_do_proposed_by_client", null)).toBeNull();
  });
});
