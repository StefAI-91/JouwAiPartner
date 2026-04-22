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
  getThemeRecentActivity,
  getThemeMeetings,
  getThemeDecisions,
  listEmergingThemes,
} from "../../src/queries/themes";
import { rejectThemeMatchAsAdmin, recalculateThemeStats } from "../../src/mutations/meeting-themes";

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

  describe("getThemeRecentActivity (TH-005)", () => {
    it("telt alleen matches binnen het window en geeft laatste match-tijd ongeacht window", async () => {
      const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const long = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      await seedMatch(MEETING_IDS.m1, THEME_IDS.hiring, recent);
      await seedMatch(MEETING_IDS.m2, THEME_IDS.hiring, long);

      const activity = await getThemeRecentActivity(THEME_IDS.hiring, { windowDays: 30 }, db);
      expect(activity.mentions).toBe(1);
      expect(activity.lastMentionedAt).toBe(recent);
    });

    it("mentions=0 als er geen matches zijn", async () => {
      const activity = await getThemeRecentActivity(THEME_IDS.hiring, {}, db);
      expect(activity.mentions).toBe(0);
      expect(activity.lastMentionedAt).toBeNull();
    });
  });

  describe("getThemeMeetings (TH-005)", () => {
    it("retourneert matches desc met evidence_quote + confidence", async () => {
      const t1 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const t2 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      await seedMatch(MEETING_IDS.m1, THEME_IDS.hiring, t1, "high");
      await seedMatch(MEETING_IDS.m2, THEME_IDS.hiring, t2, "medium");

      const rows = await getThemeMeetings(THEME_IDS.hiring, db);
      expect(rows).toHaveLength(2);
      expect(rows[0].meeting_id).toBe(MEETING_IDS.m1);
      expect(rows[0].confidence).toBe("high");
      expect(rows[0].evidence_quote).toBe("quote");
    });
  });

  describe("getThemeDecisions (TH-005)", () => {
    it("haalt alleen extractions op met type='decision'", async () => {
      const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      await seedMatch(MEETING_IDS.m1, THEME_IDS.hiring, recent);

      // Seed één decision + één need; alleen de decision moet terugkomen.
      const decisionId = "30000000-0000-4000-8000-000000000001";
      const needId = "30000000-0000-4000-8000-000000000002";
      const supabase = getTestClient();
      await supabase.from("extractions").upsert(
        [
          {
            id: decisionId,
            meeting_id: MEETING_IDS.m1,
            type: "decision",
            content: "We nemen twee junior devs aan.",
            confidence: 0.9,
          },
          {
            id: needId,
            meeting_id: MEETING_IDS.m1,
            type: "need",
            content: "Senior dev nodig",
            confidence: 0.8,
          },
        ],
        { onConflict: "id" },
      );

      const decisions = await getThemeDecisions(THEME_IDS.hiring, db);
      const ids = decisions.map((d) => d.extraction_id);
      expect(ids).toContain(decisionId);
      expect(ids).not.toContain(needId);

      await supabase.from("extractions").delete().in("id", [decisionId, needId]);
    });

    it("retourneert lege array als het thema geen gekoppelde meetings heeft", async () => {
      const decisions = await getThemeDecisions(THEME_IDS.hiring, db);
      expect(decisions).toEqual([]);
    });
  });

  describe("listEmergingThemes (TH-006)", () => {
    it("retourneert alleen status=emerging met gekoppelde proposal-meetings", async () => {
      // Link de emerging theme aan meeting m1 als proposal-origin.
      const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      await seedMatch(MEETING_IDS.m1, THEME_IDS.old, recent, "medium");

      const emerging = await listEmergingThemes(db);
      expect(emerging).toHaveLength(1);
      expect(emerging[0].id).toBe(THEME_IDS.old);
      expect(emerging[0].proposal_meetings).toHaveLength(1);
      expect(emerging[0].proposal_meetings[0].meeting_id).toBe(MEETING_IDS.m1);
    });

    it("retourneert emerging themes zonder proposal-meetings als proposal_meetings=[]", async () => {
      const emerging = await listEmergingThemes(db);
      expect(emerging).toHaveLength(1);
      expect(emerging[0].proposal_meetings).toEqual([]);
    });
  });

  describe("rejectThemeMatchAsAdmin mutation (TH-006, renamed TH-007)", () => {
    // Seed een placeholder auth.user die we als rejected_by kunnen gebruiken.
    // auth.users is shared across tests dus we gebruiken een bestaande admin
    // seed; zo niet aanwezig skippen we de insert in de EDGE-test.
    const REVIEWER_ID = "00000000-0000-0000-0000-000000000099";

    it("verwijdert de match en logt een rejection", async () => {
      const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      await seedMatch(MEETING_IDS.m1, THEME_IDS.hiring, recent);

      const result = await rejectThemeMatchAsAdmin(
        {
          meetingId: MEETING_IDS.m1,
          themeId: THEME_IDS.hiring,
          reason: "ander_thema",
          userId: REVIEWER_ID,
        },
        db,
      );
      expect("success" in result && result.success).toBe(true);
      expect("success" in result && result.alreadyRemoved).toBe(false);

      // Match weg?
      const { data: matches } = await db
        .from("meeting_themes")
        .select("meeting_id")
        .eq("theme_id", THEME_IDS.hiring)
        .eq("meeting_id", MEETING_IDS.m1);
      expect(matches).toEqual([]);

      // Rejection gelogd?
      const { data: rejections } = await db
        .from("theme_match_rejections")
        .select("reason, evidence_quote")
        .eq("theme_id", THEME_IDS.hiring)
        .eq("meeting_id", MEETING_IDS.m1);
      expect(rejections?.[0]).toMatchObject({ reason: "ander_thema", evidence_quote: "quote" });

      // Cleanup rejection-row zodat de volgende test niet trippt
      await db
        .from("theme_match_rejections")
        .delete()
        .eq("theme_id", THEME_IDS.hiring)
        .eq("meeting_id", MEETING_IDS.m1);
    });

    it("is idempotent wanneer de match al weg is (EDGE-211)", async () => {
      const result = await rejectThemeMatchAsAdmin(
        {
          meetingId: MEETING_IDS.m1,
          themeId: THEME_IDS.hiring,
          reason: "te_breed",
          userId: REVIEWER_ID,
        },
        db,
      );
      expect("success" in result && result.success).toBe(true);
      expect("success" in result && result.alreadyRemoved).toBe(true);

      const { data: rejections } = await db
        .from("theme_match_rejections")
        .select("id")
        .eq("theme_id", THEME_IDS.hiring)
        .eq("meeting_id", MEETING_IDS.m1);
      // Geen nieuwe rejection-row want er was niks om af te wijzen.
      expect(rejections ?? []).toEqual([]);
    });
  });

  describe("recalculateThemeStats RPC (TH-007)", () => {
    it("zet mention_count + last_mentioned_at op basis van aggregatie", async () => {
      const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const older = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

      // hiring: 2 matches (recent = latest), werkdruk: 1 match (older).
      await seedMatch(MEETING_IDS.m1, THEME_IDS.hiring, recent);
      await seedMatch(MEETING_IDS.m2, THEME_IDS.hiring, older);
      await seedMatch(MEETING_IDS.m3, THEME_IDS.werkdruk, older);

      const result = await recalculateThemeStats(
        [THEME_IDS.hiring, THEME_IDS.werkdruk, THEME_IDS.strategy],
        db,
      );
      expect("success" in result && result.success).toBe(true);

      const { data: rows } = await db
        .from("themes")
        .select("id, mention_count, last_mentioned_at")
        .in("id", [THEME_IDS.hiring, THEME_IDS.werkdruk, THEME_IDS.strategy])
        .order("mention_count", { ascending: false });

      const byId = new Map(rows?.map((r) => [r.id, r]) ?? []);
      expect(byId.get(THEME_IDS.hiring)?.mention_count).toBe(2);
      expect(byId.get(THEME_IDS.hiring)?.last_mentioned_at).toBe(recent);
      expect(byId.get(THEME_IDS.werkdruk)?.mention_count).toBe(1);
      expect(byId.get(THEME_IDS.werkdruk)?.last_mentioned_at).toBe(older);

      // strategy heeft geen matches → reset naar 0 / null.
      expect(byId.get(THEME_IDS.strategy)?.mention_count).toBe(0);
      expect(byId.get(THEME_IDS.strategy)?.last_mentioned_at).toBeNull();
    });

    it("is no-op bij lege theme_ids", async () => {
      const result = await recalculateThemeStats([], db);
      expect("success" in result && result.success).toBe(true);
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
