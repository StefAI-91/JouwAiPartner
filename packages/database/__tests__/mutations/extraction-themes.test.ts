import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import { seedOrganization, seedMeeting, seedExtraction, TEST_IDS } from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import {
  linkExtractionsToThemes,
  clearExtractionThemesForMeeting,
  clearExtractionThemesForThemeInMeeting,
} from "../../src/mutations/extractions/themes";

let db: ReturnType<typeof getTestClient>;

const THEME_IDS = {
  one: "10000000-0000-4000-8000-000000000f01",
  two: "10000000-0000-4000-8000-000000000f02",
} as const;

const EXTRACTION_IDS = {
  a: "30000000-0000-4000-8000-000000000f01",
  b: "30000000-0000-4000-8000-000000000f02",
} as const;

async function seedTheme(id: string, slug: string) {
  const supabase = getTestClient();
  const { error } = await supabase.from("themes").upsert(
    {
      id,
      slug,
      name: slug,
      emoji: "🧭",
      description: "desc",
      matching_guide: "guide",
      status: "verified" as const,
      verified_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`seedTheme failed: ${error.message}`);
}

describeWithDb("mutations/extraction-themes", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedMeeting({
      id: TEST_IDS.meeting,
      fireflies_id: "th010-mut-main",
      organization_id: TEST_IDS.organization,
    });
    await seedExtraction({
      id: EXTRACTION_IDS.a,
      meeting_id: TEST_IDS.meeting,
      type: "decision",
      content: "a",
    });
    await seedExtraction({
      id: EXTRACTION_IDS.b,
      meeting_id: TEST_IDS.meeting,
      type: "need",
      content: "b",
    });
    await seedTheme(THEME_IDS.one, "th-mut-one");
    await seedTheme(THEME_IDS.two, "th-mut-two");
  });

  afterEach(async () => {
    await db
      .from("extraction_themes")
      .delete()
      .in("extraction_id", [EXTRACTION_IDS.a, EXTRACTION_IDS.b]);
  });

  afterAll(async () => {
    await db.from("extractions").delete().in("id", [EXTRACTION_IDS.a, EXTRACTION_IDS.b]);
    await db.from("themes").delete().in("id", [THEME_IDS.one, THEME_IDS.two]);
    await cleanupTestData();
  });

  describe("linkExtractionsToThemes()", () => {
    it("EDGE-221: lege array retourneert success zonder DB-call", async () => {
      const result = await linkExtractionsToThemes([], db);
      expect(result).toEqual({ success: true, count: 0 });
    });

    it("inserts rijen op composite PK", async () => {
      const result = await linkExtractionsToThemes(
        [
          { extractionId: EXTRACTION_IDS.a, themeId: THEME_IDS.one, confidence: "high" },
          { extractionId: EXTRACTION_IDS.b, themeId: THEME_IDS.one, confidence: "medium" },
        ],
        db,
      );
      expect("success" in result && result.success).toBe(true);

      const { data } = await db
        .from("extraction_themes")
        .select("extraction_id, theme_id, confidence")
        .eq("theme_id", THEME_IDS.one);
      expect(data).toHaveLength(2);
    });

    it("upsert op composite PK: dubbele insert is idempotent", async () => {
      const row = {
        extractionId: EXTRACTION_IDS.a,
        themeId: THEME_IDS.one,
        confidence: "high" as const,
      };
      await linkExtractionsToThemes([row], db);
      // Tweede call zelfde PK met andere confidence — moet overschrijven, niet
      // duplicate-erroren.
      const result = await linkExtractionsToThemes([{ ...row, confidence: "medium" }], db);
      expect("success" in result && result.success).toBe(true);

      const { data } = await db
        .from("extraction_themes")
        .select("confidence")
        .eq("extraction_id", EXTRACTION_IDS.a)
        .eq("theme_id", THEME_IDS.one);
      expect(data).toHaveLength(1);
      expect(data?.[0].confidence).toBe("medium");
    });

    it("FK-error als extraction_id niet bestaat", async () => {
      const result = await linkExtractionsToThemes(
        [
          {
            extractionId: "99999999-0000-4000-8000-999999999999",
            themeId: THEME_IDS.one,
            confidence: "high",
          },
        ],
        db,
      );
      expect("error" in result).toBe(true);
    });
  });

  describe("clearExtractionThemesForMeeting()", () => {
    it("verwijdert alle extraction_themes-rijen van extractions in deze meeting", async () => {
      await linkExtractionsToThemes(
        [
          { extractionId: EXTRACTION_IDS.a, themeId: THEME_IDS.one, confidence: "high" },
          { extractionId: EXTRACTION_IDS.b, themeId: THEME_IDS.two, confidence: "medium" },
        ],
        db,
      );

      const result = await clearExtractionThemesForMeeting(TEST_IDS.meeting, db);
      expect("success" in result && result.success).toBe(true);

      const { data } = await db
        .from("extraction_themes")
        .select("extraction_id")
        .in("extraction_id", [EXTRACTION_IDS.a, EXTRACTION_IDS.b]);
      expect(data).toEqual([]);
    });

    it("success wanneer de meeting geen extractions heeft", async () => {
      const emptyMeetingId = "40000000-0000-4000-8000-000000000f01";
      await seedMeeting({
        id: emptyMeetingId,
        fireflies_id: "th010-mut-empty",
        organization_id: TEST_IDS.organization,
      });

      const result = await clearExtractionThemesForMeeting(emptyMeetingId, db);
      expect("success" in result && result.success).toBe(true);

      await db.from("meetings").delete().eq("id", emptyMeetingId);
    });
  });

  describe("clearExtractionThemesForThemeInMeeting()", () => {
    it("verwijdert alleen rijen voor (meeting_id × theme_id) paar", async () => {
      await linkExtractionsToThemes(
        [
          { extractionId: EXTRACTION_IDS.a, themeId: THEME_IDS.one, confidence: "high" },
          { extractionId: EXTRACTION_IDS.a, themeId: THEME_IDS.two, confidence: "medium" },
          { extractionId: EXTRACTION_IDS.b, themeId: THEME_IDS.one, confidence: "high" },
        ],
        db,
      );

      const result = await clearExtractionThemesForThemeInMeeting(
        TEST_IDS.meeting,
        THEME_IDS.one,
        db,
      );
      expect("success" in result && result.success).toBe(true);

      const { data } = await db
        .from("extraction_themes")
        .select("extraction_id, theme_id")
        .in("extraction_id", [EXTRACTION_IDS.a, EXTRACTION_IDS.b]);
      // theme_two-rij van extraction_a blijft staan, theme_one-rijen zijn weg.
      expect(data).toHaveLength(1);
      expect(data?.[0]).toMatchObject({
        extraction_id: EXTRACTION_IDS.a,
        theme_id: THEME_IDS.two,
      });
    });
  });
});
