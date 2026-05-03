import { describe, it, expect } from "vitest";
import {
  ISSUE_STATUSES_PER_FILTER,
  QUESTION_STATUSES_PER_FILTER,
  INBOX_LIST_LIMIT,
  type InboxFilter,
} from "../../src/queries/inbox";

/**
 * CC-008 — vóór deze sprint filterde de cockpit-inbox-page in JS na het
 * ophalen van álle items. Dat schaalt slecht zodra een team meerdere
 * projecten met >100 items heeft. De filter-logica leeft nu in de DB
 * via twee status-maps (issues + questions) per filter-bucket.
 *
 * Deze test pint die maps vast: per UI-filter precies de juiste statusset
 * (of `null` om die kant van de query over te slaan). Een wijziging hier
 * moet bewust zijn — anders verandert het zichtbaarheidsgedrag stilletjes.
 *
 * Status-semantiek (zie `replyToQuestion`-mutation):
 * - `open` = team stuurde, klant moet nog reageren → hoort bij `wacht_op_klant`
 * - `responded` = klant antwoordde, team moet acteren → hoort bij `wacht_op_mij`
 *
 * De vorige mapping was omgekeerd, met een JS-hack (`hasUnreadClientActivity`)
 * die nieuwe team-composities (geen replies, auto-gemarkeerd-gelezen) onzichtbaar
 * maakte in beide buckets. Deze test pint nu de gecorrigeerde mapping vast.
 */

describe("inbox filter mapping", () => {
  const allFilters: InboxFilter[] = ["alles", "wacht_op_mij", "wacht_op_klant", "geparkeerd"];

  it("alle vier filter-buckets hebben een entry in beide maps (exhaustive)", () => {
    for (const f of allFilters) {
      expect(ISSUE_STATUSES_PER_FILTER).toHaveProperty(f);
      expect(QUESTION_STATUSES_PER_FILTER).toHaveProperty(f);
    }
  });

  it("`alles` toont alle PM-aandacht-statussen + alle question-statussen", () => {
    expect(ISSUE_STATUSES_PER_FILTER.alles).toEqual(["needs_pm_review", "deferred"]);
    expect(QUESTION_STATUSES_PER_FILTER.alles).toEqual(["open", "responded"]);
  });

  it("`wacht_op_mij` toont needs_pm_review issues + responded questions (klant antwoordde, team moet acteren)", () => {
    expect(ISSUE_STATUSES_PER_FILTER.wacht_op_mij).toEqual(["needs_pm_review"]);
    expect(QUESTION_STATUSES_PER_FILTER.wacht_op_mij).toEqual(["responded"]);
    // Defer-items horen NIET in deze bucket.
    expect(ISSUE_STATUSES_PER_FILTER.wacht_op_mij).not.toContain("deferred");
    // Open questions horen NIET in deze bucket — die zijn `wacht_op_klant`.
    expect(QUESTION_STATUSES_PER_FILTER.wacht_op_mij).not.toContain("open");
  });

  it("`wacht_op_klant` toont alleen open questions (team stuurde, klant moet nog reageren), geen issues", () => {
    expect(ISSUE_STATUSES_PER_FILTER.wacht_op_klant).toBeNull();
    expect(QUESTION_STATUSES_PER_FILTER.wacht_op_klant).toEqual(["open"]);
  });

  it("`geparkeerd` toont alleen deferred issues, geen questions", () => {
    expect(ISSUE_STATUSES_PER_FILTER.geparkeerd).toEqual(["deferred"]);
    expect(QUESTION_STATUSES_PER_FILTER.geparkeerd).toBeNull();
  });

  it("INBOX_LIST_LIMIT is 200 (UI cued de ceiling)", () => {
    expect(INBOX_LIST_LIMIT).toBe(200);
  });

  it("non-overlap garantie: `wacht_op_klant` levert geen needs_pm_review issues op", () => {
    // wacht_op_klant skipt de issue-side helemaal; structureel onmogelijk dat
    // er needs_pm_review items in deze bucket landen. Test dat de regel houdt.
    expect(ISSUE_STATUSES_PER_FILTER.wacht_op_klant).toBeNull();
  });

  it("non-overlap garantie: question-status sets zijn disjunct over wacht_op_mij vs wacht_op_klant", () => {
    // Een vers gestuurd team-bericht (status=open) hoort exact in wacht_op_klant
    // en NERGENS anders. Dit is de regression-guard voor de bug van 2026-05-03.
    const opMij = QUESTION_STATUSES_PER_FILTER.wacht_op_mij ?? [];
    const opKlant = QUESTION_STATUSES_PER_FILTER.wacht_op_klant ?? [];
    const overlap = opMij.filter((s) => opKlant.includes(s));
    expect(overlap).toEqual([]);
  });
});
