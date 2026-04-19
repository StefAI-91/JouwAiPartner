import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  seedOrganization,
  seedProject,
  seedMeeting,
  seedExtraction,
  TEST_IDS,
} from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";
import { getExtractionsForMeetingByType } from "../../src/queries/extractions";

let db: ReturnType<typeof getTestClient>;

describeWithDb("queries/extractions", () => {
  beforeAll(async () => {
    db = getTestClient();
    await cleanupTestData();
    await seedOrganization();
    await seedProject();
  });

  afterEach(async () => {
    await db.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting);
    await db.from("meetings").delete().eq("id", TEST_IDS.meeting);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("getExtractionsForMeetingByType()", () => {
    it("returnt alleen extractions van het gevraagde type (geen leakage)", async () => {
      // PW-QC-02 QUAL-QC-011: als er voor één meeting meerdere types in
      // de DB staan (risk + decision + action_item), mag de query alleen
      // de gevraagde type-slice teruggeven. Voorkomt UI-leakage in de
      // /dev/extractor harness.
      await seedMeeting({ id: TEST_IDS.meeting });
      await seedExtraction({
        id: "00000000-0000-0000-0000-0000000000a1",
        meeting_id: TEST_IDS.meeting,
        type: "risk",
        content: "Budget loopt vol",
      });
      await seedExtraction({
        id: "00000000-0000-0000-0000-0000000000a2",
        meeting_id: TEST_IDS.meeting,
        type: "decision",
        content: "Nieuwe scope goedgekeurd",
      });
      await seedExtraction({
        id: "00000000-0000-0000-0000-0000000000a3",
        meeting_id: TEST_IDS.meeting,
        type: "action_item",
        content: "Deploy plannen",
      });

      const risks = await getExtractionsForMeetingByType(TEST_IDS.meeting, "risk", db);

      expect(risks).toHaveLength(1);
      expect(risks[0].content).toBe("Budget loopt vol");
    });

    it("returnt lege array als er geen extractions van dat type zijn", async () => {
      await seedMeeting({ id: TEST_IDS.meeting });
      await seedExtraction({
        id: "00000000-0000-0000-0000-0000000000b1",
        meeting_id: TEST_IDS.meeting,
        type: "decision",
        content: "Enige extraction",
      });

      const risks = await getExtractionsForMeetingByType(TEST_IDS.meeting, "risk", db);
      expect(risks).toEqual([]);
    });

    it("sorteert op created_at desc (meest recente run eerst)", async () => {
      await seedMeeting({ id: TEST_IDS.meeting });
      // Twee extractions met uiteenlopende created_at — desc volgorde betekent
      // dat de meest recente run boven staat in de harness.
      await seedExtraction({
        id: "00000000-0000-0000-0000-0000000000c1",
        meeting_id: TEST_IDS.meeting,
        type: "risk",
        content: "Oude risk",
        created_at: "2026-01-01T10:00:00Z",
      });
      await seedExtraction({
        id: "00000000-0000-0000-0000-0000000000c2",
        meeting_id: TEST_IDS.meeting,
        type: "risk",
        content: "Nieuwe risk",
        created_at: "2026-04-01T10:00:00Z",
      });

      const risks = await getExtractionsForMeetingByType(TEST_IDS.meeting, "risk", db);

      expect(risks).toHaveLength(2);
      expect(risks[0].content).toBe("Nieuwe risk");
      expect(risks[1].content).toBe("Oude risk");
    });

    it("returnt lege array voor onbestaande meeting", async () => {
      const result = await getExtractionsForMeetingByType(
        "00000000-0000-0000-0000-000000000999",
        "risk",
        db,
      );
      expect(result).toEqual([]);
    });
  });
});
