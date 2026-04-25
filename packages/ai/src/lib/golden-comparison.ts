/**
 * Vergelijkings-utility voor de Action Item Specialist harness.
 *
 * Match-strategie v1: loose. Twee items matchen als:
 *   1. follow_up_contact letterlijk gelijk is (case-insensitive, getrimd)
 *   2. content-similarity ≥ contentThreshold (default 0.55) — trigram-overlap
 *
 * Strict-velden (deadline, source_quote, type_werk, lane) worden NIET
 * gebruikt voor matching maar wél gerapporteerd als secundaire metrics.
 *
 * Waarom loose: in v1 willen we eerst weten of de agent überhaupt de juiste
 * items extraheert. Streng matchen op deadline-format of source-quote-prefix
 * geeft 0% precision en leert ons niets over de extractie-kwaliteit.
 */

export interface ComparableItem {
  id?: string; // optioneel — golden heeft id, agent-output niet
  content: string;
  follow_up_contact: string;
  type_werk?: string | null;
  deadline?: string | null;
  source_quote?: string | null;
  category?: string | null;
}

export type DiffStatus = "match" | "extra" | "missed";

export interface DiffEntry {
  status: DiffStatus;
  /** Item zoals door de agent geproduceerd (alleen bij match/extra). */
  extracted?: ComparableItem;
  /** Item zoals in de golden dataset (alleen bij match/missed). */
  golden?: ComparableItem;
  /** Match-similarity tussen 0 en 1 (alleen bij match). */
  similarity?: number;
  /** Of type_werk overeenkomt (alleen bij match, met beide type_werk gevuld). */
  type_werk_matches?: boolean;
}

export interface ComparisonResult {
  precision: number; // tp / (tp + fp), 0..1
  recall: number; // tp / (tp + fn), 0..1
  f1: number; // 2pr / (p+r), 0..1
  matched: number;
  extra: number; // false positives (agent extracted but not in golden)
  missed: number; // false negatives (in golden but agent didn't extract)
  diff: DiffEntry[];
  /** Type_werk-accuracy op gematchte items (negeert extra/missed). */
  type_werk_accuracy: number | null;
}

/**
 * Trigram-overlap voor losse content-matching. Niet perfect, maar robuust
 * tegen kleine herformuleringen ("Jan navragen of vragenlijst is teruggekomen"
 * vs "Vragenlijst bij Jan checken"). Levenshtein zou nauwkeuriger zijn maar
 * is bij short strings overbodig.
 */
export function contentSimilarity(a: string, b: string): number {
  const aTrigrams = trigrams(a);
  const bTrigrams = trigrams(b);
  if (aTrigrams.size === 0 || bTrigrams.size === 0) return 0;
  let intersection = 0;
  for (const t of aTrigrams) {
    if (bTrigrams.has(t)) intersection++;
  }
  // Jaccard-like: |A ∩ B| / |A ∪ B|
  const union = aTrigrams.size + bTrigrams.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function trigrams(text: string): Set<string> {
  const normalised = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalised.length < 3) return new Set([normalised]);
  const out = new Set<string>();
  for (let i = 0; i <= normalised.length - 3; i++) {
    out.add(normalised.slice(i, i + 3));
  }
  return out;
}

function contactMatches(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

interface CompareOptions {
  /** Minimum content-similarity voor een match (default 0.55). */
  contentThreshold?: number;
}

/**
 * Vergelijkt geëxtraheerde items met golden ground-truth en levert
 * precision/recall + diff. Greedy match: voor elk extracted item zoekt
 * hij de golden met hoogste similarity (boven threshold) en koppelt die.
 * Eenmaal gekoppelde golden-items kunnen niet opnieuw matchen.
 */
export function comparePrecisionRecall(
  extracted: ComparableItem[],
  golden: ComparableItem[],
  options: CompareOptions = {},
): ComparisonResult {
  const threshold = options.contentThreshold ?? 0.55;

  const usedGolden = new Set<number>();
  const diff: DiffEntry[] = [];

  for (const ex of extracted) {
    let bestIdx = -1;
    let bestSim = 0;
    for (let i = 0; i < golden.length; i++) {
      if (usedGolden.has(i)) continue;
      const g = golden[i];
      if (!contactMatches(ex.follow_up_contact, g.follow_up_contact)) continue;
      const sim = contentSimilarity(ex.content, g.content);
      if (sim >= threshold && sim > bestSim) {
        bestIdx = i;
        bestSim = sim;
      }
    }
    if (bestIdx >= 0) {
      usedGolden.add(bestIdx);
      const g = golden[bestIdx];
      const typeWerkMatches =
        ex.type_werk != null && g.type_werk != null ? ex.type_werk === g.type_werk : undefined;
      diff.push({
        status: "match",
        extracted: ex,
        golden: g,
        similarity: bestSim,
        type_werk_matches: typeWerkMatches,
      });
    } else {
      diff.push({ status: "extra", extracted: ex });
    }
  }

  // Resterende golden = missed
  for (let i = 0; i < golden.length; i++) {
    if (!usedGolden.has(i)) {
      diff.push({ status: "missed", golden: golden[i] });
    }
  }

  const matched = diff.filter((d) => d.status === "match").length;
  const extra = diff.filter((d) => d.status === "extra").length;
  const missed = diff.filter((d) => d.status === "missed").length;

  const precision = matched + extra > 0 ? matched / (matched + extra) : 0;
  const recall = matched + missed > 0 ? matched / (matched + missed) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Type_werk accuracy alleen op matches met beide velden gevuld
  const typeWerkEvaluable = diff.filter(
    (d) => d.status === "match" && d.type_werk_matches !== undefined,
  );
  const typeWerkCorrect = typeWerkEvaluable.filter((d) => d.type_werk_matches).length;
  const typeWerkAccuracy =
    typeWerkEvaluable.length > 0 ? typeWerkCorrect / typeWerkEvaluable.length : null;

  return {
    precision,
    recall,
    f1,
    matched,
    extra,
    missed,
    diff,
    type_werk_accuracy: typeWerkAccuracy,
  };
}

/**
 * Aggregeer comparison-resultaten over meerdere meetings naar één macro-metric.
 * Macro-gemiddelde (gewicht per meeting gelijk), niet micro (gewicht per item).
 * Macro is eerlijker bij ongelijke meeting-sizes.
 */
export function aggregateComparisons(results: ComparisonResult[]): Pick<
  ComparisonResult,
  "precision" | "recall" | "f1" | "matched" | "extra" | "missed"
> & {
  meeting_count: number;
  type_werk_accuracy: number | null;
} {
  if (results.length === 0) {
    return {
      precision: 0,
      recall: 0,
      f1: 0,
      matched: 0,
      extra: 0,
      missed: 0,
      meeting_count: 0,
      type_werk_accuracy: null,
    };
  }
  const sum = (key: "precision" | "recall" | "f1") => results.reduce((acc, r) => acc + r[key], 0);
  const totalCount = (key: "matched" | "extra" | "missed") =>
    results.reduce((acc, r) => acc + r[key], 0);

  const tw = results.map((r) => r.type_werk_accuracy).filter((v): v is number => v !== null);

  return {
    precision: sum("precision") / results.length,
    recall: sum("recall") / results.length,
    f1: sum("f1") / results.length,
    matched: totalCount("matched"),
    extra: totalCount("extra"),
    missed: totalCount("missed"),
    meeting_count: results.length,
    type_werk_accuracy: tw.length > 0 ? tw.reduce((a, b) => a + b, 0) / tw.length : null,
  };
}
