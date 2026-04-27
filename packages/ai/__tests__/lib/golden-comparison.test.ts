import { describe, it, expect } from "vitest";
import {
  comparePrecisionRecall,
  contentSimilarity,
  aggregateComparisons,
  type ComparableItem,
  type ComparisonResult,
} from "../../src/lib/golden-comparison";

function item(overrides: Partial<ComparableItem> = {}): ComparableItem {
  return {
    content: "Standaardtaak voor Jan",
    follow_up_contact: "Jan",
    ...overrides,
  };
}

describe("contentSimilarity", () => {
  it("returns 1 voor identieke strings", () => {
    expect(contentSimilarity("Vragenlijst checken bij Jan", "Vragenlijst checken bij Jan")).toBe(1);
  });

  it("returns 0 voor compleet ongerelateerde strings", () => {
    expect(contentSimilarity("Mailen naar klant", "xyz")).toBe(0);
  });

  it("normaliseert hoofdletters en interpunctie", () => {
    const a = "Vragenlijst! Bij JAN.";
    const b = "vragenlijst bij jan";
    expect(contentSimilarity(a, b)).toBeGreaterThan(0.9);
  });

  it("herkent paraphrases als deels-overlappend", () => {
    const a = "Jan navragen of vragenlijst is teruggekomen";
    const b = "Vragenlijst bij Jan checken";
    const sim = contentSimilarity(a, b);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it("returns 0 bij éénzijdig lege string", () => {
    // Note: contentSimilarity("", "") geeft momenteel 1 terug door de
    // <3-char trigram-fallback. In productie onbereikbaar omdat extracted
    // en golden content NOT NULL zijn — daarom hier geen assertie op.
    expect(contentSimilarity("", "iets")).toBe(0);
    expect(contentSimilarity("iets", "")).toBe(0);
  });
});

describe("comparePrecisionRecall", () => {
  it("perfecte match: precision=1, recall=1, f1=1", () => {
    const items = [
      item({ content: "Vragenlijst bij Jan checken", follow_up_contact: "Jan" }),
      item({ content: "Offerte naar Mark sturen", follow_up_contact: "Mark" }),
    ];
    const result = comparePrecisionRecall(items, items);
    expect(result.precision).toBe(1);
    expect(result.recall).toBe(1);
    expect(result.f1).toBe(1);
    expect(result.matched).toBe(2);
    expect(result.extra).toBe(0);
    expect(result.missed).toBe(0);
  });

  it("alle extra (geen golden): precision=0, recall=0", () => {
    const extracted = [item({ content: "Random taak", follow_up_contact: "Jan" })];
    const result = comparePrecisionRecall(extracted, []);
    expect(result.precision).toBe(0);
    expect(result.recall).toBe(0);
    expect(result.matched).toBe(0);
    expect(result.extra).toBe(1);
    expect(result.missed).toBe(0);
    expect(result.diff[0].status).toBe("extra");
  });

  it("alle missed (geen extracted): recall=0, missed wordt geteld", () => {
    const golden = [item({ content: "Vragenlijst bij Jan", follow_up_contact: "Jan" })];
    const result = comparePrecisionRecall([], golden);
    expect(result.precision).toBe(0);
    expect(result.recall).toBe(0);
    expect(result.matched).toBe(0);
    expect(result.extra).toBe(0);
    expect(result.missed).toBe(1);
    expect(result.diff[0].status).toBe("missed");
  });

  it("beide leeg: alle metrics op 0, geen diff-entries", () => {
    const result = comparePrecisionRecall([], []);
    expect(result.precision).toBe(0);
    expect(result.recall).toBe(0);
    expect(result.f1).toBe(0);
    expect(result.diff).toEqual([]);
  });

  it("partiële match: 1 match + 1 extra + 1 missed → precision=0.5, recall=0.5", () => {
    const extracted = [
      item({ content: "Vragenlijst bij Jan checken", follow_up_contact: "Jan" }),
      item({ content: "Random taak voor Pete", follow_up_contact: "Pete" }),
    ];
    const golden = [
      item({ content: "Vragenlijst bij Jan checken", follow_up_contact: "Jan" }),
      item({ content: "Offerte naar Mark sturen", follow_up_contact: "Mark" }),
    ];
    const result = comparePrecisionRecall(extracted, golden);
    expect(result.matched).toBe(1);
    expect(result.extra).toBe(1);
    expect(result.missed).toBe(1);
    expect(result.precision).toBe(0.5);
    expect(result.recall).toBe(0.5);
    expect(result.f1).toBeCloseTo(0.5, 5);
  });

  it("contact-mismatch verhindert match ondanks gelijke content", () => {
    const extracted = [item({ content: "Vragenlijst bij Jan", follow_up_contact: "Jan" })];
    const golden = [item({ content: "Vragenlijst bij Jan", follow_up_contact: "Mark" })];
    const result = comparePrecisionRecall(extracted, golden);
    expect(result.matched).toBe(0);
    expect(result.extra).toBe(1);
    expect(result.missed).toBe(1);
  });

  it("voornaam-fuzzy match: 'Guido Leduc' matcht 'Guido'", () => {
    const extracted = [
      item({ content: "Vragenlijst bij Guido checken", follow_up_contact: "Guido Leduc" }),
    ];
    const golden = [item({ content: "Vragenlijst bij Guido checken", follow_up_contact: "Guido" })];
    const result = comparePrecisionRecall(extracted, golden);
    expect(result.matched).toBe(1);
  });

  it("verschillende voornaam met zelfde initialen: GEEN match (Wouter vs Wim)", () => {
    const extracted = [
      item({ content: "Vragenlijst bij iemand met W", follow_up_contact: "Wouter" }),
    ];
    const golden = [item({ content: "Vragenlijst bij iemand met W", follow_up_contact: "Wim" })];
    const result = comparePrecisionRecall(extracted, golden);
    expect(result.matched).toBe(0);
  });

  it("quote-overlap reddt een paraphrase die op content faalt", () => {
    const sharedQuote =
      "ik laat het deze week even rustig liggen, maar volgende week pak ik het wel weer op";
    const extracted = [
      item({
        content: "X gaat volgende week opvolgen op de openstaande vraag",
        follow_up_contact: "Jan",
        source_quote: sharedQuote,
      }),
    ];
    const golden = [
      item({
        content: "Vragenlijst bij Jan navragen na de week",
        follow_up_contact: "Jan",
        source_quote: sharedQuote,
      }),
    ];
    const result = comparePrecisionRecall(extracted, golden);
    expect(result.matched).toBe(1);
    expect(result.diff[0].similarity).toBe(1);
  });

  it("source_quote korter dan 20 chars telt niet als quote-overlap-bewijs", () => {
    const extracted = [
      item({
        content: "Compleet andere woorden dan de golden hierna",
        follow_up_contact: "Jan",
        source_quote: "ja klopt",
      }),
    ];
    const golden = [
      item({
        content: "Heel ander zinnetje dat niet matcht qua trigrams",
        follow_up_contact: "Jan",
        source_quote: "ja klopt",
      }),
    ];
    const result = comparePrecisionRecall(extracted, golden);
    expect(result.matched).toBe(0);
  });

  it("greedy match: één golden-item kan niet aan twee extracted gekoppeld worden", () => {
    const extracted = [
      item({ content: "Vragenlijst bij Jan checken", follow_up_contact: "Jan" }),
      item({ content: "Vragenlijst bij Jan checken", follow_up_contact: "Jan" }),
    ];
    const golden = [item({ content: "Vragenlijst bij Jan checken", follow_up_contact: "Jan" })];
    const result = comparePrecisionRecall(extracted, golden);
    expect(result.matched).toBe(1);
    expect(result.extra).toBe(1);
    expect(result.missed).toBe(0);
  });

  it("type_werk_accuracy: alleen op matches met beide velden gevuld", () => {
    const extracted = [
      item({
        content: "Vragenlijst bij Jan checken",
        follow_up_contact: "Jan",
        type_werk: "A",
      }),
      item({
        content: "Offerte naar Mark sturen",
        follow_up_contact: "Mark",
        type_werk: "B",
      }),
    ];
    const golden = [
      item({
        content: "Vragenlijst bij Jan checken",
        follow_up_contact: "Jan",
        type_werk: "A",
      }),
      item({
        content: "Offerte naar Mark sturen",
        follow_up_contact: "Mark",
        type_werk: "C",
      }),
    ];
    const result = comparePrecisionRecall(extracted, golden);
    expect(result.matched).toBe(2);
    expect(result.type_werk_accuracy).toBe(0.5);
  });

  it("type_werk_accuracy: null bij alle matches met ontbrekend veld", () => {
    const extracted = [
      item({ content: "Vragenlijst bij Jan checken", follow_up_contact: "Jan", type_werk: null }),
    ];
    const golden = [
      item({ content: "Vragenlijst bij Jan checken", follow_up_contact: "Jan", type_werk: "A" }),
    ];
    const result = comparePrecisionRecall(extracted, golden);
    expect(result.matched).toBe(1);
    expect(result.type_werk_accuracy).toBeNull();
  });

  it("threshold: aanpasbaar via options", () => {
    // Twee items met lichte paraphrase. Bij default 0.4 matcht het mogelijk;
    // bij 0.99 zeker niet.
    const extracted = [
      item({ content: "Vragenlijst bij Jan navragen volgende week", follow_up_contact: "Jan" }),
    ];
    const golden = [
      item({ content: "Bij Jan checken of de vragenlijst klaar is", follow_up_contact: "Jan" }),
    ];
    const strict = comparePrecisionRecall(extracted, golden, { contentThreshold: 0.99 });
    expect(strict.matched).toBe(0);
  });
});

describe("aggregateComparisons", () => {
  function fakeResult(p: number, r: number, matched: number): ComparisonResult {
    return {
      precision: p,
      recall: r,
      f1: p + r > 0 ? (2 * p * r) / (p + r) : 0,
      matched,
      extra: 0,
      missed: 0,
      diff: [],
      type_werk_accuracy: null,
    };
  }

  it("lege input geeft lege aggregaten met meeting_count 0", () => {
    const agg = aggregateComparisons([]);
    expect(agg.meeting_count).toBe(0);
    expect(agg.precision).toBe(0);
    expect(agg.recall).toBe(0);
    expect(agg.type_werk_accuracy).toBeNull();
  });

  it("macro-gemiddelde over meetings (gelijk gewicht per meeting)", () => {
    const agg = aggregateComparisons([fakeResult(1, 1, 10), fakeResult(0, 0, 0)]);
    expect(agg.meeting_count).toBe(2);
    // Macro: (1 + 0) / 2 = 0.5 — niet de micro 10/(10+0) = 1
    expect(agg.precision).toBe(0.5);
    expect(agg.recall).toBe(0.5);
    expect(agg.matched).toBe(10);
  });

  it("type_werk_accuracy negeert null-resultaten in aggregatie", () => {
    const agg = aggregateComparisons([
      { ...fakeResult(1, 1, 1), type_werk_accuracy: 1 },
      { ...fakeResult(1, 1, 1), type_werk_accuracy: null },
      { ...fakeResult(1, 1, 1), type_werk_accuracy: 0.5 },
    ]);
    // Gemiddelde van alleen de niet-null: (1 + 0.5) / 2 = 0.75
    expect(agg.type_werk_accuracy).toBe(0.75);
  });

  it("type_werk_accuracy is null als alle individuele resultaten null zijn", () => {
    const agg = aggregateComparisons([
      { ...fakeResult(1, 1, 1), type_werk_accuracy: null },
      { ...fakeResult(1, 1, 1), type_werk_accuracy: null },
    ]);
    expect(agg.type_werk_accuracy).toBeNull();
  });
});
