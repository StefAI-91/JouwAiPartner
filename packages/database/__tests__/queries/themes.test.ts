import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import { seedOrganization, seedMeeting, TEST_IDS } from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import {
  listVerifiedThemes,
  listTopActiveThemes,
  getThemeShareDistribution,
  getThemeBySlug,
} from "../../src/queries/themes";

let db: ReturnType<typeof getTestClient>;

const THEME_IDS = {
  hiring: "10000000-0000-0000-0000-000000000001",
  werkdruk: "10000000-0000-0000-0000-000000000002",
  strategy: "10000000-0000-0000-0000-000000000003",
  old: "10000000-0000-0000-0000-000000000004",
} as const;

const MEETING_IDS = {
  m1: "20000000-0000-0000-0000-000000000001",
  m2: "20000000-0000-0000-0000-000000000002",
  m3: "20000000-0000-0000-0000-000000000003",
} as const;

async function seedTheme(id: string, overrides: Record<string, unknown> = {}) {
  const supabase = getTestClient();
  const base = {
    id,
    slug: `test-${id.slice(-3)}`,
    name: `Theme ${id.slice(-3)}`,
    emoji: "🧭",
    description: "desc",
    matching_guide: "guide",
    status: "verified" as const,
    verified_at: new Date().toISOString(),
    ...overrides,
  };
  const { error } = await supabase.from("themes").upsert(base, { onConflict: "id" });
  if (error) throw new Error(`seedTheme failed: ${error.message}`);
}

async function seedMatch(
  meetingId: string,
  themeId: string,
  createdAt: string,
  confidence: "medium" | "high" = "high",
) {
  const supabase = getTestClient();
  const { error } = await supabase.from("meeting_themes").upsert(
    {
      meeting_id: meetingId,
      theme_id: themeId,
      confidence,
      evidence_quote: "quote",
      created_at: createdAt,
    },
    { onConflict: "meeting_id,theme_id" },
  );
  if (error) throw new Error(`seedMatch failed: ${error.message}`);
}

async function cleanupThemes() {
  const supabase = getTestClient();
  const themeIds = Object.values(THEME_IDS);
  await supabase.from("meeting_themes").delete().in("theme_id", themeIds);
  await supabase.from("themes").delete().in("id", themeIds);
  await supabase.from("meetings").delete().in("id", Object.values(MEETING_IDS));
}

describeWithDb("queries/themes", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await cleanupThemes();
    await seedOrganization();
  });

  beforeEach(async () => {
    await cleanupThemes();
    // Seed 3 verified themes + 1 emerging (noise — moet niet verschijnen)
    await seedTheme(THEME_IDS.hiring, { slug: "hiring", name: "Hiring" });
    await seedTheme(THEME_IDS.werkdruk, { slug: "werkdruk", name: "Werkdruk" });
    await seedTheme(THEME_IDS.strategy, { slug: "strategy", name: "Strategy" });
    await seedTheme(THEME_IDS.old, {
      slug: "emerging-one",
      name: "Emerging",
      status: "emerging",
      verified_at: null,
    });

    await seedMeeting({ id: MEETING_IDS.m1 });
    await seedMeeting({ id: MEETING_IDS.m2, fireflies_id: "th-m2" });
    await seedMeeting({ id: MEETING_IDS.m3, fireflies_id: "th-m3" });
  });

  afterAll(async () => {
    await cleanupThemes();
    await cleanupTestData();
  });

  describe("listVerifiedThemes", () => {
    it("retourneert alleen status=verified themes", async () => {
      const themes = await listVerifiedThemes({}, db);
      const slugs = themes.map((t) => t.slug);
      expect(slugs).toContain("hiring");
      expect(slugs).toContain("werkdruk");
      expect(slugs).toContain("strategy");
      expect(slugs).not.toContain("emerging-one");
    });
  });

  describe("getThemeBySlug", () => {
    it("vindt een verified theme op slug", async () => {
      const theme = await getThemeBySlug("hiring", db);
      expect(theme?.id).toBe(THEME_IDS.hiring);
    });

    it("retourneert null voor onbekende slug", async () => {
      const theme = await getThemeBySlug("does-not-exist", db);
      expect(theme).toBeNull();
    });
  });

  describe("listTopActiveThemes", () => {
    it("sorteert op mentions desc en skipt themes met 0 mentions", async () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const older = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

      // hiring: 3 mentions. werkdruk: 1. strategy: 0.
      await seedMatch(MEETING_IDS.m1, THEME_IDS.hiring, recent);
      await seedMatch(MEETING_IDS.m2, THEME_IDS.hiring, older);
      await seedMatch(MEETING_IDS.m3, THEME_IDS.hiring, recent);
      await seedMatch(MEETING_IDS.m1, THEME_IDS.werkdruk, recent);

      const top = await listTopActiveThemes({ limit: 8, windowDays: 30 }, db);
      const slugs = top.map((t) => t.slug);
      expect(slugs).toEqual(["hiring", "werkdruk"]);
      expect(top[0].mentions30d).toBe(3);
      expect(top[1].mentions30d).toBe(1);
    });

    it("filtert matches buiten het window weg", async () => {
      const long = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      await seedMatch(MEETING_IDS.m1, THEME_IDS.hiring, long);
      const top = await listTopActiveThemes({ windowDays: 30 }, db);
      expect(top).toEqual([]);
    });

    it("respecteert limit", async () => {
      const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      await seedMatch(MEETING_IDS.m1, THEME_IDS.hiring, recent);
      await seedMatch(MEETING_IDS.m1, THEME_IDS.werkdruk, recent);
      await seedMatch(MEETING_IDS.m1, THEME_IDS.strategy, recent);
      const top = await listTopActiveThemes({ limit: 2 }, db);
      expect(top).toHaveLength(2);
    });
  });

  describe("getThemeShareDistribution", () => {
    it("berekent share relatief aan totaal en sommeert naar ~1.0", async () => {
      const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      // hiring: 3, werkdruk: 1 → total 4 → 0.75 + 0.25
      await seedMatch(MEETING_IDS.m1, THEME_IDS.hiring, recent);
      await seedMatch(MEETING_IDS.m2, THEME_IDS.hiring, recent);
      await seedMatch(MEETING_IDS.m3, THEME_IDS.hiring, recent);
      await seedMatch(MEETING_IDS.m1, THEME_IDS.werkdruk, recent);

      const dist = await getThemeShareDistribution({}, db);
      expect(dist.totalMentions).toBe(4);
      expect(dist.slices).toHaveLength(2);
      expect(dist.slices[0].theme.slug).toBe("hiring");
      expect(dist.slices[0].share).toBeCloseTo(0.75, 5);
      expect(dist.slices[1].share).toBeCloseTo(0.25, 5);
      const sum = dist.slices.reduce((s, x) => s + x.share, 0);
      expect(sum).toBeCloseTo(1, 5);
    });

    it("retourneert lege slices + totalMentions=0 zonder matches", async () => {
      const dist = await getThemeShareDistribution({}, db);
      expect(dist.totalMentions).toBe(0);
      expect(dist.slices).toEqual([]);
    });
  });
});
